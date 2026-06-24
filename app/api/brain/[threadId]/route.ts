import { NextResponse } from "next/server";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { callBrain, type BrainAssessmentResult } from "@/lib/brain-api";
import { requireBrainThreadAccess } from "@/lib/brain-thread-access";
import { apiError } from "@/lib/api-security";

export async function GET(request: Request, context: { params: Promise<{ threadId: string }> }) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const { threadId } = await context.params;

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    await requireOrgMembership(orgId, session.user.id);
    await requireBrainThreadAccess(orgId, session.user.id, threadId);
    const state = await callBrain<BrainAssessmentResult>(`/brain/${threadId}/state`);

    return NextResponse.json(state);
  } catch (error) {
    return apiError(error, "Failed to fetch brain state");
  }
}
