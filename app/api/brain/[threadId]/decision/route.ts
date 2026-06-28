import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { callBrain, type BrainAssessmentResult } from "@/lib/brain-api";
import { requireBrainThreadAccess, requireThreadAlertAccess } from "@/lib/brain-thread-access";
import { apiError, readJsonBody, sanitizeText } from "@/lib/api-security";
import { requireWritableSubscription } from "@/lib/subscriptions";

type DecisionBody = {
  orgId?: string;
  alertId?: string | null;
  familyDecision?: string;
};

const ALLOWED_DECISIONS = new Set([
  "request_professional_review",
  "contact_emergency_services_user_initiated",
  "monitor_at_home",
  "notify_nurse",
]);

function decisionDescription(decision: string) {
  if (decision === "request_professional_review") {
    return "Family requested review by a qualified professional.";
  }
  if (decision === "contact_emergency_services_user_initiated") {
    return "Family recorded that they chose to contact emergency services.";
  }
  return `Care coordination note recorded: ${decision.replace(/_/g, " ")}`;
}

export async function POST(request: Request, context: { params: Promise<{ threadId: string }> }) {
  try {
    const session = await requireSession();
    const { threadId } = await context.params;
    const body = await readJsonBody<DecisionBody>(request);

    if (!body.orgId || !body.familyDecision) {
      return NextResponse.json(
        { error: "orgId and familyDecision are required" },
        { status: 400 }
      );
    }

    await requireOrgMembership(body.orgId, session.user.id);
    await requireWritableSubscription(body.orgId);
    const thread = await requireBrainThreadAccess(body.orgId, session.user.id, threadId);
    const alert = body.alertId
      ? await requireThreadAlertAccess(body.orgId, threadId, body.alertId)
      : null;
    const familyDecision = sanitizeText(body.familyDecision, 500);
    if (!familyDecision) {
      return NextResponse.json({ error: "familyDecision is required" }, { status: 400 });
    }
    if (!ALLOWED_DECISIONS.has(familyDecision)) {
      return NextResponse.json({ error: "Invalid familyDecision" }, { status: 400 });
    }

    const result = await callBrain<BrainAssessmentResult>(`/brain/${threadId}/decision`, {
      method: "POST",
      body: JSON.stringify({ family_decision: familyDecision }),
    });

    await prisma.brainThread.update({
      where: { threadId },
      data: { status: result.status, alertId: body.alertId ?? thread.alertId },
    });

    if (body.alertId) {
      await prisma.alert.updateMany({
        where: { id: body.alertId, organizationId: body.orgId },
        data: {
          actionTaken: JSON.stringify({
            brainThreadId: threadId,
            familyDecision,
            executedActions: result.state.executed_actions ?? [],
          }),
          resolvedAt: new Date(),
          resolvedById: session.user.id,
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        organizationId: body.orgId,
        patientId: alert?.patientId ?? thread.patientId,
        type: "SYSTEM_NOTE",
        title: "Family decision recorded",
        description: decisionDescription(familyDecision),
        userId: session.user.id,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "Failed to submit decision");
  }
}
