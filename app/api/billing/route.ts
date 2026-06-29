import { NextResponse } from "next/server";
import type { PlanTier } from "@prisma/client";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { PLAN_LIMITS } from "@/lib/subscription-limits";
import {
  getEffectivePlan,
  getEffectiveSubscriptionStatus,
  isTrialSubscription,
  requireOrgSubscription,
  startUserTrial,
} from "@/lib/subscriptions";
import {
  billingIntervalForStripePriceId,
  getStripe,
  isStripeConfigured,
  stripePriceIdForInterval,
  type BillingInterval,
} from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { apiError, readJsonBody } from "@/lib/api-security";

const BILLING_INTERVAL_DAYS = {
  month: 30,
  semi_annual: 180,
  year: 365,
} as const satisfies Record<BillingInterval, number>;

const BILLING_INTERVALS = ["month", "semi_annual", "year"] as const;

function isBillingInterval(value: unknown): value is BillingInterval {
  return typeof value === "string" && value in BILLING_INTERVAL_DAYS;
}

function devPriceIdForInterval(interval: BillingInterval) {
  return `dev:PRO:${interval}`;
}

async function getStripeCancelState(stripeSubId: string | null) {
  const stripe = getStripe();
  if (!stripe || !stripeSubId) return null;
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId);
  const raw = stripeSubscription as unknown as {
    cancel_at_period_end?: boolean;
    current_period_end?: number;
    items?: { data?: Array<{ id?: string; price?: { id?: string } }> };
  };

  return {
    cancelAtPeriodEnd: Boolean(raw.cancel_at_period_end),
    currentPeriodEnd:
      typeof raw.current_period_end === "number"
        ? new Date(raw.current_period_end * 1000)
        : null,
    itemId: raw.items?.data?.[0]?.id ?? null,
    priceId: raw.items?.data?.[0]?.price?.id ?? null,
  };
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

    const member = await requireOrgMembership(orgId, session.user.id);
    if (member.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subscription = await requireOrgSubscription(orgId);
    const stripeState = subscription.stripeSubId
      ? await getStripeCancelState(subscription.stripeSubId)
      : null;
    if (stripeState) {
      await prisma.user.update({
        where: { id: subscription.userId },
        data: {
          cancelAtPeriodEnd: stripeState.cancelAtPeriodEnd,
          currentPeriodEnd: stripeState.currentPeriodEnd ?? subscription.currentPeriodEnd,
          stripePriceId: stripeState.priceId ?? subscription.stripePriceId,
        },
      });
    }

    const currentStripePriceId = stripeState?.priceId ?? subscription.stripePriceId;
    const currentInterval = billingIntervalForStripePriceId(currentStripePriceId);
    const currentPeriodEnd = stripeState?.currentPeriodEnd ?? subscription.currentPeriodEnd;
    const cancelAtPeriodEnd = stripeState?.cancelAtPeriodEnd ?? subscription.cancelAtPeriodEnd;
    const effectivePlan = getEffectivePlan({
      ...subscription,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    });
    const status = getEffectiveSubscriptionStatus({
      ...subscription,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    });
    const memberCount = await prisma.member.count({ where: { organizationId: orgId } });
    const pendingInvites = await prisma.workspaceInvite.count({
      where: { organizationId: orgId, status: "PENDING", expiresAt: { gt: new Date() } },
    });

    return NextResponse.json({
      data: {
        plan: effectivePlan,
        status,
        currentInterval,
        currentPeriodEnd: (currentPeriodEnd ?? subscription.trialEndsAt)?.toISOString() ?? null,
        trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
        cancelAtPeriodEnd,
        memberCount,
        pendingInvites,
        limits: PLAN_LIMITS[effectivePlan],
        plans: BILLING_INTERVALS.map((interval) => ({
          plan: "PRO" as PlanTier,
          interval,
          stripePriceId: stripePriceIdForInterval(interval) || devPriceIdForInterval(interval),
          ...PLAN_LIMITS.PRO,
        })),
        stripeConfigured: isStripeConfigured(),
        hasStripeCustomer: !!subscription.stripeCustomerId,
        hasStripeSubscription: !!subscription.stripeSubId,
        hasUsedTrial: !!subscription.trialEndsAt,
        isTrial: isTrialSubscription(subscription),
        isOwner: true,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch billing");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<{
      orgId?: string;
      plan?: "PRO";
      interval?: BillingInterval;
    }>(request);
    const { orgId, plan, interval = "month" } = body;

    if (!orgId || plan !== "PRO" || !isBillingInterval(interval)) {
      return NextResponse.json({ error: "Invalid orgId, plan, or interval" }, { status: 400 });
    }

    const member = await requireOrgMembership(orgId, session.user.id);
    if (member.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subscription = await requireOrgSubscription(orgId);
    if (!subscription.trialEndsAt && !subscription.stripeSubId) {
      const trial = await startUserTrial(subscription.userId);
      return NextResponse.json({
        data: {
          mode: "trial",
          trialEndsAt: trial.trialEndsAt?.toISOString() ?? null,
        },
      });
    }

    const stripe = getStripe();
    const priceId = stripePriceIdForInterval(interval);
    if (!stripe || !priceId) {
      throw new Error("Billing is not configured");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    let customerId = subscription.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name,
        metadata: { userId: subscription.userId },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: subscription.userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      payment_method_collection: "always",
      customer: customerId,
      client_reference_id: subscription.userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/${orgId}/settings/billing?success=1`,
      cancel_url: `${baseUrl}/${orgId}/settings/billing?canceled=1`,
      metadata: { userId: subscription.userId, orgId, plan, interval },
      subscription_data: {
        metadata: { userId: subscription.userId, orgId, plan, interval },
      },
    });

    return NextResponse.json({ data: { url: checkout.url, mode: "stripe" } });
  } catch (error) {
    return apiError(error, "Failed to start checkout");
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<{ orgId?: string; interval?: BillingInterval }>(request);
    const { orgId, interval } = body;

    if (!orgId || !isBillingInterval(interval)) {
      return NextResponse.json({ error: "Invalid orgId or interval" }, { status: 400 });
    }

    const member = await requireOrgMembership(orgId, session.user.id);
    if (member.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subscription = await requireOrgSubscription(orgId);
    const currentInterval = billingIntervalForStripePriceId(subscription.stripePriceId);
    if (currentInterval === interval && !subscription.cancelAtPeriodEnd) {
      return NextResponse.json({ data: { changed: false, reason: "already-current" } });
    }

    const stripe = getStripe();
    const priceId = stripePriceIdForInterval(interval);

    if (!stripe || !priceId) {
      throw new Error("Billing is not configured");
    }

    const stripeSubId = subscription.stripeSubId;
    if (!stripeSubId) {
      return NextResponse.json(
        { error: "No active subscription. Start checkout first." },
        { status: 409 }
      );
    }

    const stripeState = await getStripeCancelState(stripeSubId);
    const itemId = stripeState?.itemId;
    if (!itemId) {
      throw new Error("Stripe subscription item not found");
    }

    const updatedStripeSubscription = await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: false,
      proration_behavior: "none",
      items: [{ id: itemId, price: priceId }],
      metadata: { userId: subscription.userId, orgId, plan: "PRO", interval },
    });

    const raw = updatedStripeSubscription as unknown as {
      current_period_end?: number;
      items?: { data?: Array<{ price?: { id?: string } }> };
    };

    const updated = await prisma.user.update({
      where: { id: subscription.userId },
      data: {
        planType: "PRO",
        subscriptionStatus: "ACTIVE",
        cancelAtPeriodEnd: false,
        stripePriceId: raw.items?.data?.[0]?.price?.id ?? priceId,
        currentPeriodEnd:
          typeof raw.current_period_end === "number"
            ? new Date(raw.current_period_end * 1000)
            : subscription.currentPeriodEnd,
      },
    });

    return NextResponse.json({ data: { subscription: updated, mode: "stripe-change" } });
  } catch (error) {
    return apiError(error, "Failed to change billing plan");
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<{ orgId?: string }>(request);
    const { orgId } = body;

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const member = await requireOrgMembership(orgId, session.user.id);
    if (member.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subscription = await requireOrgSubscription(orgId);
    const stripe = getStripe();

    if (stripe && subscription.stripeSubId) {
      const stripeSubscription = await stripe.subscriptions.update(subscription.stripeSubId, {
        cancel_at_period_end: true,
      });
      const raw = stripeSubscription as unknown as {
        current_period_end?: number;
        cancel_at_period_end?: boolean;
      };

      const updated = await prisma.user.update({
        where: { id: subscription.userId },
        data: {
          cancelAtPeriodEnd: Boolean(raw.cancel_at_period_end),
          currentPeriodEnd:
            typeof raw.current_period_end === "number"
              ? new Date(raw.current_period_end * 1000)
              : subscription.currentPeriodEnd,
        },
      });

      return NextResponse.json({ data: { subscription: updated, mode: "stripe-cancel-at-period-end" } });
    }

    const updated = await prisma.user.update({
      where: { id: subscription.userId },
      data: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: subscription.currentPeriodEnd ?? new Date(),
      },
    });

    return NextResponse.json({ data: { subscription: updated, mode: "dev-cancel-at-period-end" } });
  } catch (error) {
    return apiError(error, "Failed to cancel subscription");
  }
}
