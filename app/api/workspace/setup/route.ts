import { NextResponse } from "next/server";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { ensureUserSubscriptionRecord, getEffectivePlan } from "@/lib/subscriptions";
import { apiError, readJsonBody } from "@/lib/api-security";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<{ orgId?: string }>(request);
    if (!body.orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const member = await requireOrgMembership(body.orgId, session.user.id);
    if (member.role !== "owner") {
      throw new Error("Forbidden");
    }

    const subscription = await ensureUserSubscriptionRecord(session.user.id);

    return NextResponse.json({
      data: { plan: getEffectivePlan(subscription), organizationId: body.orgId, ownerId: session.user.id },
    });
  } catch (error) {
    return apiError(error, "Failed to setup workspace");
  }
}
