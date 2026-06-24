import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { apiError } from "@/lib/api-security";
import { getAccessiblePatientIds, requirePatientAccess } from "@/lib/workspace-access";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const patientId = searchParams.get("patientId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    await requireOrgMembership(orgId, session.user.id);
    const accessiblePatientIds = await getAccessiblePatientIds(orgId, session.user.id);
    if (accessiblePatientIds === undefined) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (patientId) {
      await requirePatientAccess(orgId, session.user.id, patientId);
    }

    const alert = await prisma.alert.findFirst({
      where: {
        organizationId: orgId,
        ...(patientId
          ? { patientId }
          : accessiblePatientIds === null
            ? {}
            : { patientId: { in: accessiblePatientIds } }),
        resolvedAt: null,
        level: { in: ["WARNING", "CRITICAL"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!alert?.actionTaken) {
      return NextResponse.json({ threadId: null, alertId: null });
    }

    try {
      const meta = JSON.parse(alert.actionTaken) as {
        brainThreadId?: string;
        status?: string;
      };
      return NextResponse.json({
        threadId: meta.brainThreadId ?? null,
        alertId: alert.id,
        patientId: alert.patientId,
      });
    } catch {
      return NextResponse.json({ threadId: null, alertId: alert.id, patientId: alert.patientId });
    }
  } catch (error) {
    return apiError(error, "Failed to fetch active alert");
  }
}
