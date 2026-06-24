import { NextResponse } from "next/server";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { getPortalAccess } from "@/lib/workspace-access";
import { apiError } from "@/lib/api-security";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    await requireOrgMembership(orgId, session.user.id);
    const access = await getPortalAccess(orgId, session.user.id);

    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: access });
  } catch (error) {
    return apiError(error, "Failed to fetch portal access");
  }
}
