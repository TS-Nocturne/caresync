import { NextResponse } from "next/server";
import type { PortalRole } from "@prisma/client";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/subscription-limits";
import {
  buildInviteUrl,
  createWorkspaceInvite,
  revokeWorkspaceInvite,
} from "@/lib/workspace-invites";
import { getEffectivePlan, requireOrgSubscription } from "@/lib/subscriptions";
import { apiError, readJsonBody, sanitizeText } from "@/lib/api-security";

async function requireOwner(orgId: string, userId: string) {
  const member = await requireOrgMembership(orgId, userId);
  if (member.role !== "owner") throw new Error("Forbidden");
  return member;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

    await requireOwner(orgId, session.user.id);

    const subscription = await requireOrgSubscription(orgId);
    const plan = getEffectivePlan(subscription);
    const [invites, memberCount] = await Promise.all([
      prisma.workspaceInvite.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          acceptedBy: { select: { name: true, email: true } },
          createdBy: { select: { name: true } },
        },
      }),
      prisma.member.count({ where: { organizationId: orgId } }),
    ]);

    const pendingCount = invites.filter(
      (invite) => invite.status === "PENDING" && invite.expiresAt > new Date()
    ).length;

    return NextResponse.json({
      data: invites.map((invite) => ({
        id: invite.id,
        token: invite.token,
        url: buildInviteUrl(invite.token),
        portalRole: invite.portalRole,
        relationLabel: invite.relationLabel,
        status: invite.status,
        expiresAt: invite.expiresAt.toISOString(),
        acceptedAt: invite.acceptedAt?.toISOString() ?? null,
        acceptedBy: invite.acceptedBy,
        createdBy: invite.createdBy,
        createdAt: invite.createdAt.toISOString(),
        isExpired: invite.status === "PENDING" && invite.expiresAt < new Date(),
      })),
      limits: PLAN_LIMITS[plan],
      memberCount,
      pendingCount,
      plan,
    });
  } catch (error) {
    return apiError(error, "Failed to list invites");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<{
      orgId?: string;
      portalRole?: PortalRole;
      relationLabel?: string;
      patientId?: string;
    }>(request);

    const { orgId, portalRole, relationLabel, patientId } = body;
    if (!orgId || !portalRole) {
      return NextResponse.json({ error: "orgId and portalRole are required" }, { status: 400 });
    }

    if (portalRole !== "CAREGIVER" && portalRole !== "FAMILY") {
      return NextResponse.json({ error: "Invalid portalRole" }, { status: 400 });
    }

    await requireOwner(orgId, session.user.id);

    const invite = await createWorkspaceInvite({
      orgId,
      createdById: session.user.id,
      portalRole,
      relationLabel: sanitizeText(relationLabel, 120) || undefined,
      patientId,
    });

    return NextResponse.json({
      data: {
        id: invite.id,
        token: invite.token,
        url: buildInviteUrl(invite.token),
        portalRole: invite.portalRole,
        expiresAt: invite.expiresAt.toISOString(),
        organizationName: invite.organization.name,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to create invite");
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const inviteId = searchParams.get("inviteId");

    if (!orgId || !inviteId) {
      return NextResponse.json({ error: "orgId and inviteId are required" }, { status: 400 });
    }

    await requireOwner(orgId, session.user.id);
    await revokeWorkspaceInvite(inviteId, orgId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to revoke invite");
  }
}
