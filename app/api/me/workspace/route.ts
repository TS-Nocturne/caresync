import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { getPortalAccess } from "@/lib/workspace-access";
import { apiError } from "@/lib/api-security";

export async function GET() {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    // Get all memberships for this user
    const memberships = await prisma.member.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
            patients: {
              take: 1,
              orderBy: { updatedAt: "desc" },
              select: {
                firstName: true,
                lastName: true,
                roomNumber: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // No memberships — send to onboarding
    if (memberships.length === 0) {
      return NextResponse.json({ redirect: "/onboarding" });
    }

    // Single workspace — auto-redirect (original behavior)
    const hasDeletedWorkspace = memberships.some((m) => m.organization.deletedAt);

    if (memberships.length === 1 && !hasDeletedWorkspace) {
      const orgId = memberships[0].organizationId;
      const access = await getPortalAccess(orgId, userId);
      const redirect = access?.homePath ?? `/${orgId}/dashboard`;
      return NextResponse.json({ redirect });
    }

    // Multiple workspaces — return list for WorkspaceSelector
    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const access = await getPortalAccess(m.organizationId, userId);
        const patient = m.organization.patients[0];
        return {
          id: m.organization.id,
          name: m.organization.name,
          role: m.role,
          isDeleted: Boolean(m.organization.deletedAt),
          deletedAt: m.organization.deletedAt?.toISOString() ?? null,
          roleLabel: access?.roleLabel ?? "สมาชิก",
          homePath: m.organization.deletedAt ? "/dashboard" : access?.homePath ?? `/${m.organizationId}/dashboard`,
          patientName: patient
            ? `${patient.firstName} ${patient.lastName}`
            : null,
          patientRoom: patient?.roomNumber ?? null,
        };
      })
    );

    return NextResponse.json({
      multipleWorkspaces: true,
      workspaces,
    });
  } catch (error) {
    return apiError(error, "Failed to fetch workspace");
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
      include: { organization: { select: { deletedAt: true } } },
    });

    if (!member) {
      throw new Error("Not found");
    }

    if (!member.organization.deletedAt) {
      return NextResponse.json({ error: "Room has not been deleted" }, { status: 400 });
    }

    if (member.role === "owner") {
      return NextResponse.json({ error: "Owner cannot remove the deleted room from this menu" }, { status: 400 });
    }

    await prisma.member.delete({
      where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    });

    return NextResponse.json({ data: { removed: true } });
  } catch (error) {
    return apiError(error, "Failed to remove deleted room");
  }
}
