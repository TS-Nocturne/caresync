import { prisma } from "./prisma";
import type { PlanTier, SubStatus } from "@prisma/client";

export type UserSubscription = {
  userId: string;
  organizationId?: string;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
  stripeSubId: string | null;
  plan: PlanTier;
  status: SubStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
};

function toUserSubscription(
  user: {
    id: string;
    planType: PlanTier;
    subscriptionStatus: SubStatus;
    stripeCustomerId: string | null;
    stripePriceId: string | null;
    stripeSubId: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    trialEndsAt: Date | null;
  },
  organizationId?: string
): UserSubscription {
  return {
    userId: user.id,
    organizationId,
    stripeCustomerId: user.stripeCustomerId,
    stripePriceId: user.stripePriceId,
    stripeSubId: user.stripeSubId,
    plan: user.planType,
    status: user.subscriptionStatus,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    currentPeriodEnd: user.currentPeriodEnd,
    trialEndsAt: user.trialEndsAt,
  };
}

export async function ensureUserSubscriptionRecord(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
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
  });

  return toUserSubscription(user);
}

export async function getOrgOwnerSubscription(orgId: string) {
  const owner = await prisma.member.findFirstOrThrow({
    where: { organizationId: orgId, role: "owner" },
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
    },
  });

  return toUserSubscription(owner.user, orgId);
}

export async function ensureSubscriptionRecord(orgId: string) {
  return getOrgOwnerSubscription(orgId);
}

export async function requireOrgSubscription(orgId: string) {
  return getOrgOwnerSubscription(orgId);
}

export function isTrialSubscription(subscription: UserSubscription, now = new Date()) {
  return subscription.trialEndsAt != null && subscription.trialEndsAt >= now;
}

export function isSubscriptionActive(subscription: UserSubscription, now = new Date()) {
  const paidActive =
    subscription.plan === "PRO" &&
    subscription.status === "ACTIVE" &&
    subscription.currentPeriodEnd != null &&
    subscription.currentPeriodEnd >= now;

  return paidActive || isTrialSubscription(subscription, now);
}

export function getEffectivePlan(subscription: UserSubscription, now = new Date()): PlanTier {
  return isSubscriptionActive(subscription, now) ? "PRO" : "FREE";
}

export function getEffectiveSubscriptionStatus(subscription: UserSubscription, now = new Date()) {
  if (isTrialSubscription(subscription, now)) return "TRIAL";
  if (isSubscriptionActive(subscription, now) && subscription.cancelAtPeriodEnd) {
    return "CANCELING";
  }
  if (isSubscriptionActive(subscription, now)) return subscription.status;
  return "EXPIRED";
}

export async function startUserTrial(userId: string, now = new Date()) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      trialEndsAt: true,
      planType: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripePriceId: true,
      stripeSubId: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
    },
  });

  if (user.trialEndsAt) {
    return toUserSubscription(user);
  }

  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { trialEndsAt },
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
  });

  return toUserSubscription(updated);
}

export async function requireWritableSubscription(orgId: string) {
  const subscription = await requireOrgSubscription(orgId);
  if (!isSubscriptionActive(subscription)) {
    throw new Error("Subscription expired");
  }
  return subscription;
}
