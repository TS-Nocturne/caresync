import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { apiError, readJsonBody } from "@/lib/api-security";
import { syncPatientContextToPinecone } from "@/lib/patient-context-sync";

type RetrySyncBody = {
  orgId?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ patientId: string }> }
) {
  try {
    const session = await requireSession();
    const { patientId } = await context.params;
    const body = await readJsonBody<RetrySyncBody>(request);

    if (!body.orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const member = await requireOrgMembership(body.orgId, session.user.id);
    if (member.role !== "owner" && member.role !== "admin") {
      throw new Error("Forbidden");
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: body.orgId },
      include: {
        emergencyContacts: true,
        medications: true,
      },
    });

    if (!patient) {
      throw new Error("Patient not found");
    }

    await prisma.patient.update({
      where: { id: patient.id },
      data: { pineconeSyncStatus: "PENDING" },
    });

    const result = await syncPatientContextToPinecone(patient);
    const updated = await prisma.patient.findUniqueOrThrow({
      where: { id: patient.id },
      select: { pineconeSyncStatus: true },
    });

    return NextResponse.json({
      data: {
        ok: result.ok,
        pineconeSyncStatus: updated.pineconeSyncStatus,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to retry AI sync");
  }
}
