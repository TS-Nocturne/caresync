import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { apiError, readJsonBody } from "@/lib/api-security";
import {
  getMedicationWindowForTime,
  isMedicationDueOnDate,
  isMedicationInWindow,
} from "@/lib/medication-schedule";
import { requireWritableSubscription } from "@/lib/subscriptions";
import { getPortalAccess, requirePatientAccess } from "@/lib/workspace-access";

type MedicationSkipReason = "FAMILY_GIVEN" | "PATIENT_SELF_ADMINISTERED" | "OTHER";

function actorRoleLabel(access: Awaited<ReturnType<typeof getPortalAccess>>) {
  if (access?.isFamily && !access.isCaregiver && !access.isOwner && !access.isAdmin) return "FAMILY";
  return "CAREGIVER";
}

function skipReasonTitle(reason?: MedicationSkipReason) {
  if (reason === "FAMILY_GIVEN") return "Skip: family already gave medication";
  if (reason === "PATIENT_SELF_ADMINISTERED") return "Skip: patient already self-administered";
  return "Medication skipped";
}

const PRN_DUPLICATE_WINDOW_MS = 4 * 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const patientId = searchParams.get("patientId");
    const now = searchParams.get("now") ?? undefined;
    const today = searchParams.get("today") ?? undefined;

    if (!orgId || !patientId) {
      return NextResponse.json({ error: "orgId and patientId are required" }, { status: 400 });
    }

    await requireOrgMembership(orgId, session.user.id);
    await requirePatientAccess(orgId, session.user.id, patientId);

    const window = getMedicationWindowForTime(now);
    const medications = await prisma.medication.findMany({
      where: { organizationId: orgId, patientId },
      orderBy: [{ scheduleTime: "asc" }, { name: "asc" }],
    });
    const regularMedications = medications.filter(
      (medication) =>
        !medication.isPrn &&
        isMedicationDueOnDate(medication, today) &&
        isMedicationInWindow(medication.scheduleTime, window)
    );
    const prnMedications = medications.filter((medication) => medication.isPrn);

    return NextResponse.json({
      data: regularMedications,
      prnData: prnMedications,
      window: {
        id: window.id,
        label: window.label,
        start: window.start,
        end: window.end,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch medications");
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<{
      orgId?: string;
      medicationId?: string;
      status?: "GIVEN" | "SKIPPED" | "PENDING";
      signatureUrl?: string;
      skipReason?: MedicationSkipReason;
      evidenceVerified?: boolean;
    }>(request);

    const { orgId, medicationId, status, signatureUrl, skipReason, evidenceVerified } = body;

    if (!orgId || !medicationId || !status) {
      return NextResponse.json(
        { error: "orgId, medicationId, and status are required" },
        { status: 400 }
      );
    }

    await requireOrgMembership(orgId, session.user.id);
    await requireWritableSubscription(orgId);
    const access = await getPortalAccess(orgId, session.user.id);

    const medication = await prisma.medication.findFirst({
      where: { id: medicationId, organizationId: orgId },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });

    if (!medication) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    await requirePatientAccess(orgId, session.user.id, medication.patientId);

    if (
      status === "SKIPPED" &&
      (skipReason === "FAMILY_GIVEN" || skipReason === "PATIENT_SELF_ADMINISTERED") &&
      evidenceVerified !== true
    ) {
      return NextResponse.json(
        { error: "Please verify the pill organizer or medication packet before confirming this skip reason." },
        { status: 400 }
      );
    }

    const handledByRole =
      status === "SKIPPED" && skipReason === "PATIENT_SELF_ADMINISTERED"
        ? "PATIENT"
        : actorRoleLabel(access);

    if (status === "PENDING") {
      const reset = await prisma.medication.update({
        where: { id: medicationId },
        data: {
          status,
          signatureUrl: null,
          skipReason: null,
          handledByName: null,
          handledByRole: null,
          givenAt: null,
        },
      });
      return NextResponse.json({ data: reset });
    }

    if (status === "GIVEN" && medication.isPrn) {
      const recentDuplicate = await prisma.medication.findFirst({
        where: {
          id: { not: medicationId },
          organizationId: orgId,
          patientId: medication.patientId,
          isPrn: true,
          name: medication.name,
          strength: medication.strength,
          status: "GIVEN",
          givenAt: { gte: new Date(Date.now() - PRN_DUPLICATE_WINDOW_MS) },
        },
        orderBy: { givenAt: "desc" },
      });

      if (recentDuplicate) {
        return NextResponse.json(
          { error: "This PRN medication was already given within the last 4 hours." },
          { status: 409 }
        );
      }
    }

    const updateResult = await prisma.medication.updateMany({
      where: { id: medicationId, organizationId: orgId, status: "PENDING" },
      data: {
        status,
        signatureUrl: status === "GIVEN" ? (signatureUrl ?? medication.signatureUrl) : null,
        skipReason: status === "SKIPPED" ? (skipReason ?? "OTHER") : null,
        handledByName: session.user.name,
        handledByRole,
        givenAt: status === "GIVEN" ? new Date() : medication.givenAt,
      },
    });

    const updated = await prisma.medication.findUniqueOrThrow({ where: { id: medicationId } });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: "This medication has already been handled. Refresh the list before changing it again.", data: updated },
        { status: 409 }
      );
    }

    await prisma.activityLog.create({
      data: {
        organizationId: orgId,
        patientId: medication.patientId,
        type: status === "GIVEN" ? "MEDICATION_GIVEN" : "MEDICATION_SKIPPED",
        title: status === "GIVEN" ? "ให้ยาแล้ว (มีลายเซ็น)" : "ข้ามการให้ยา",
        description: [
          medication.name,
          medication.strength,
          medication.doseAmount != null && medication.doseUnit
            ? `${medication.doseAmount} ${medication.doseUnit}`
            : medication.dosage,
          medication.isPrn ? "(PRN)" : null,
          status === "SKIPPED" ? skipReasonTitle(skipReason) : null,
          status === "SKIPPED" && evidenceVerified ? "(evidence verified)" : null,
          "—",
          medication.patient.firstName,
          medication.patient.lastName,
        ].filter(Boolean).join(" "),
        userId: session.user.id,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return apiError(error, "Failed to update medication");
  }
}
