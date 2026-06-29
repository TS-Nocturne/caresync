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

export async function runExpiredAccountPatientRetention(now = new Date()) {
  const owners = await prisma.member.findMany({
    where: { role: "owner", organization: { deletedAt: null } },
    include: {
      user: {
        select: {
          id: true,
          planType: true,
          subscriptionStatus: true,
          stripeCustomerId: true,
          stripePriceId: true,
          stripeSubId: true,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
        },
      },
      organization: {
        select: {
          id: true,
          patients: { select: { id: true } },
        },
      },
    },
  });

  const results: Array<{ orgId: string; ownerId: string; deletedPatients: number }> = [];

  for (const owner of owners) {
    const subscription: UserSubscription = {
      userId: owner.user.id,
      organizationId: owner.organizationId,
      stripeCustomerId: owner.user.stripeCustomerId,
      stripePriceId: owner.user.stripePriceId,
      stripeSubId: owner.user.stripeSubId,
      plan: owner.user.planType,
      status: owner.user.subscriptionStatus,
      cancelAtPeriodEnd: owner.user.cancelAtPeriodEnd,
      currentPeriodEnd: owner.user.currentPeriodEnd,
      trialEndsAt: owner.user.trialEndsAt,
    };

    if (!shouldDeletePatientsForExpiredAccount(subscription, now)) {
      continue;
    }

    let deletedPatients = 0;
    for (const patient of owner.organization.patients) {
      const deleted = await deletePatientData({
        orgId: owner.organizationId,
        patientId: patient.id,
        actorUserId: null,
        reason: "auto-deleted after 1 year without active subscription",
      });
      if (deleted) deletedPatients += 1;
    }

    if (deletedPatients > 0) {
      results.push({ orgId: owner.organizationId, ownerId: owner.userId, deletedPatients });
    }
  }

  return {
    organizationsChecked: owners.length,
    organizationsDeletedFrom: results.length,
    deletedPatients: results.reduce((sum, result) => sum + result.deletedPatients, 0),
    results,
  };
}
