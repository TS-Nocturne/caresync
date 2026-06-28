import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { requirePermission } from "@/lib/caregiver-access";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError, readJsonBody } from "@/lib/api-security";
import {
  getMedicationWindowForTime,
  isMedicationDueOnDate,
  isMedicationInWindow,
} from "@/lib/medication-schedule";
import { requireWritableSubscription } from "@/lib/subscriptions";

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
    await requirePermission(orgId, session.user.id, patientId, PERMISSIONS.MEDICATIONS_READ);

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
    }>(request);

    const { orgId, medicationId, status, signatureUrl } = body;

    if (!orgId || !medicationId || !status) {
      return NextResponse.json(
        { error: "orgId, medicationId, and status are required" },
        { status: 400 }
      );
    }

    await requireOrgMembership(orgId, session.user.id);
    await requireWritableSubscription(orgId);

    const medication = await prisma.medication.findFirst({
      where: { id: medicationId, organizationId: orgId },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });

    if (!medication) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    await requirePermission(orgId, session.user.id, medication.patientId, PERMISSIONS.MEDICATIONS_WRITE);

    const updated = await prisma.medication.update({
      where: { id: medicationId },
      data: {
        status,
        signatureUrl: signatureUrl ?? medication.signatureUrl,
        givenAt: status === "GIVEN" ? new Date() : status === "PENDING" ? null : medication.givenAt,
      },
    });

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
