import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-server";
import { apiError, readJsonBody, sanitizeText } from "@/lib/api-security";
import { getPortalAccess } from "@/lib/workspace-access";

type ResolveAlertBody = {
  orgId?: string;
  alertId?: string;
  reason?: string;
};

function parseActionTaken(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<ResolveAlertBody>(request);
    const orgId = sanitizeText(body.orgId, 128);
    const alertId = sanitizeText(body.alertId, 128);
    const reason = sanitizeText(body.reason, 500);

    if (!orgId || !alertId || !reason) {
      return NextResponse.json({ error: "orgId, alertId, and reason are required" }, { status: 400 });
    }

    const access = await getPortalAccess(orgId, session.user.id);
    if (!access) throw new Error("Forbidden");

    const canManageAlerts = access.isOwner || access.isAdmin || access.isCaregiver;
    if (!canManageAlerts) throw new Error("Forbidden");

    const alert = await prisma.alert.findUnique({
      where: { id: alertId, organizationId: orgId },
    });

    if (!alert) throw new Error("Alert not found");

    if (alert.resolvedAt) {
      return NextResponse.json({ error: "Alert is already resolved" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.alert.update({
        where: { id: alertId },
        data: {
          resolvedAt: new Date(),
          resolvedById: session.user.id,
          actionTaken: JSON.stringify({
            ...parseActionTaken(alert.actionTaken),
            resolvedReason: reason,
          }),
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          patientId: alert.patientId,
          type: "SYSTEM_NOTE",
          title: "Emergency alert resolved",
          description: `Reason: ${reason}`,
          userId: session.user.id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to resolve alert");
  }
}
