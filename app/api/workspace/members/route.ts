import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { getPortalAccess } from "@/lib/workspace-access";
import { revokeMemberAccess } from "@/lib/workspace-invites";
import { apiError } from "@/lib/api-security";

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

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    const members = await prisma.member.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const enriched = await Promise.all(
      members.map(async (member) => {
        const access = await getPortalAccess(orgId, member.userId);
        return {
          id: member.id,
          userId: member.userId,
          orgRole: member.role,
          name: member.user.name,
          email: member.user.email,
          image: member.user.image,
          roleLabel: access?.roleLabel ?? member.role,
          isCaregiver: access?.isCaregiver ?? false,
          isFamily: access?.isFamily ?? false,
          joinedAt: member.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ data: enriched, organizationName: organization?.name ?? "" });
  } catch (error) {
    return apiError(error, "Failed to list members");
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const userId = searchParams.get("userId");

    if (!orgId || !userId) {
      return NextResponse.json({ error: "orgId and userId are required" }, { status: 400 });
    }

    await requireOwner(orgId, session.user.id);
    await revokeMemberAccess(orgId, userId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to revoke member");
  }
}
