import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { acceptWorkspaceInvite } from "@/lib/workspace-invites";
import { getPortalAccess } from "@/lib/workspace-access";
import { apiError } from "@/lib/api-security";

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const session = await requireSession();
    const { token } = await context.params;

    const result = await acceptWorkspaceInvite(token, session.user.id);
    const access = await getPortalAccess(result.organizationId, session.user.id);

    return NextResponse.json({
      success: true,
      organizationId: result.organizationId,
      redirect: access?.homePath ?? `/${result.organizationId}/dashboard`,
    });
  } catch (error) {
    return apiError(error, "Failed to accept invite");
  }
}
