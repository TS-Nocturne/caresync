import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { callBrain, type BrainAssessmentResult } from "@/lib/brain-api";
import { requireBrainThreadAccess } from "@/lib/brain-thread-access";
import { apiError, readJsonBody, sanitizeText } from "@/lib/api-security";
import { requireWritableSubscription } from "@/lib/subscriptions";

type AvailabilityBody = {
  orgId?: string;
  memberName?: string;
  day?: number;
  startHour?: number;
  endHour?: number;
  note?: string;
};

function isValidAvailability(body: AvailabilityBody) {
  return (
    body.day != null &&
    body.day >= 0 &&
    body.day <= 6 &&
    body.startHour != null &&
    body.startHour >= 0 &&
    body.startHour <= 23 &&
    body.endHour != null &&
    body.endHour >= 1 &&
    body.endHour <= 24 &&
    body.endHour > body.startHour
  );
}

export async function POST(request: Request, context: { params: Promise<{ threadId: string }> }) {
  try {
    const session = await requireSession();
    const { threadId } = await context.params;
    const body = await readJsonBody<AvailabilityBody>(request);

    if (!body.orgId || !isValidAvailability(body)) {
      return NextResponse.json(
        { error: "orgId, day, startHour, and endHour are required" },
        { status: 400 }
      );
    }

    await requireOrgMembership(body.orgId, session.user.id);
    await requireWritableSubscription(body.orgId);
    const thread = await requireBrainThreadAccess(body.orgId, session.user.id, threadId);
    const memberName = sanitizeText(body.memberName, 120) || session.user.name;
    const note = sanitizeText(body.note, 500) || "available_for_family_follow_up";

    const result = await callBrain<BrainAssessmentResult>(`/brain/${threadId}/availability`, {
      method: "POST",
      body: JSON.stringify({
        member_name: memberName,
        day: body.day,
        start_hour: body.startHour,
        end_hour: body.endHour,
        note,
      }),
    });

    await prisma.brainThread.update({
      where: { threadId },
      data: { status: result.status },
    });

    await prisma.activityLog.create({
      data: {
        organizationId: body.orgId,
        patientId: thread.patientId,
        type: "SYSTEM_NOTE",
        title: "Family availability recorded",
        description: `${memberName} available day ${body.day} ${body.startHour}:00-${body.endHour}:00`,
        userId: session.user.id,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "Failed to update availability");
  }
}
