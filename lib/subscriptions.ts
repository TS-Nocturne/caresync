import { prisma } from "./prisma";

export function trialEndDate(days = 14) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + days);
  return trialEnd;
}

export async function createTrialSubscription(orgId: string) {
  return prisma.subscription.upsert({
    where: { organizationId: orgId },
    update: {},
    create: {
      organizationId: orgId,
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodEnd: trialEndDate(),
    },
  });
}

export async function requireOrgSubscription(orgId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
  if (!subscription) {
    throw new Error("Subscription not found");
  }
  return subscription;
}
