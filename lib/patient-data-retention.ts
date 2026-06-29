import { prisma } from "./prisma";
import { getEffectivePlan, type UserSubscription } from "./subscriptions";

export async function deletePatientData({
  orgId,
  patientId,
  actorUserId,
  reason,
}: {
  orgId: string;
  patientId: string;
  actorUserId?: string | null;
  reason: string;
}) {
  return prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) return null;

    await tx.brainThread.deleteMany({ where: { organizationId: orgId, patientId } });
    await tx.workspaceInvite.updateMany({
      where: { organizationId: orgId, patientId, status: "PENDING" },
      data: { status: "REVOKED" },
    });
    await tx.patientRegistrationDraft.deleteMany({ where: { organizationId: orgId } });
    await tx.patient.delete({ where: { id: patientId } });
    await tx.activityLog.create({
      data: {
        organizationId: orgId,
        type: "SYSTEM_NOTE",
        title: "ลบข้อมูลผู้สูงอายุ",
        description: reason,
        userId: actorUserId ?? undefined,
      },
    });

    return patient;
  });
}

export function getInactiveSince(subscription: UserSubscription) {
  const dates = [subscription.currentPeriodEnd, subscription.trialEndsAt].filter(
    (date): date is Date => date instanceof Date
  );
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

export function shouldDeletePatientsForExpiredAccount(subscription: UserSubscription, now = new Date()) {
  if (getEffectivePlan(subscription, now) !== "FREE") return false;

  const inactiveSince = getInactiveSince(subscription);
  if (!inactiveSince) return false;

  const oneYearAfterInactive = new Date(inactiveSince);
  oneYearAfterInactive.setFullYear(oneYearAfterInactive.getFullYear() + 1);
  return oneYearAfterInactive <= now;
}
