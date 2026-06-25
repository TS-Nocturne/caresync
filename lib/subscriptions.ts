import { prisma } from "./prisma";
import type { PlanTier, Subscription } from "@prisma/client";

export async function ensureSubscriptionRecord(orgId: string) {
  return prisma.subscription.upsert({
    where: { organizationId: orgId },
    update: {},
    create: {
      organizationId: orgId,
      plan: "FREE",
      status: "ACTIVE",
      currentPeriodEnd: null,
    },
  });
}

export async function requireOrgSubscription(orgId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
  if (!subscription) {
    return ensureSubscriptionRecord(orgId);
  }
  return subscription;
}

export function isSubscriptionActive(subscription: Subscription, now = new Date()) {
  return (
    subscription.status === "ACTIVE" &&
    subscription.currentPeriodEnd != null &&
    subscription.currentPeriodEnd >= now
  );
}

export function isTrialSubscription(subscription: Subscription, now = new Date()) {
  void subscription;
  void now;
  return false;
}

export function getEffectivePlan(subscription: Subscription, now = new Date()): PlanTier {
  return isSubscriptionActive(subscription, now) ? subscription.plan : "FREE";
}

export function getEffectiveSubscriptionStatus(subscription: Subscription, now = new Date()) {
  if (isSubscriptionActive(subscription, now) && subscription.cancelAtPeriodEnd) {
    return "CANCELING";
  }
  if (isSubscriptionActive(subscription, now)) return subscription.status;
  return "EXPIRED";
}

export async function requireWritableSubscription(orgId: string) {
  const subscription = await requireOrgSubscription(orgId);
  if (!isSubscriptionActive(subscription)) {
    throw new Error("Subscription expired");
  }
  return subscription;
}
