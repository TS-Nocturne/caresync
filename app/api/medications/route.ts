import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { requirePermission } from "@/lib/caregiver-access";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError, readJsonBody } from "@/lib/api-security";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const patientId = searchParams.get("patientId");

    if (!orgId || !patientId) {
      return NextResponse.json({ error: "orgId and patientId are required" }, { status: 400 });
    }

    await requireOrgMembership(orgId, session.user.id);
    await requirePermission(orgId, session.user.id, patientId, PERMISSIONS.MEDICATIONS_READ);

    const medications = await prisma.medication.findMany({
      where: { organizationId: orgId, patientId },
      orderBy: [{ scheduleTime: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: medications });
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
        description: `${medication.name} ${medication.dosage} — ${medication.patient.firstName} ${medication.patient.lastName}`,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return apiError(error, "Failed to update medication");
  }
}
