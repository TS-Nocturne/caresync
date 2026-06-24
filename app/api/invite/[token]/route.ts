import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-security";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: { 
        organization: { select: { name: true } },
        createdBy: { select: { name: true } }
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "ลิงก์เชิญไม่ถูกต้อง" }, { status: 404 });
    }

    const expired = invite.expiresAt < new Date();
    const effectiveStatus =
      invite.status === "PENDING" && expired ? "EXPIRED" : invite.status;

    return NextResponse.json({
      data: {
        organizationName: invite.organization.name,
        inviterName: invite.createdBy.name,
        portalRole: invite.portalRole,
        relationLabel: invite.relationLabel,
        status: effectiveStatus,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    return apiError(error, "Failed to load invite");
  }
}
