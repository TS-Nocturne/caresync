import { NextResponse } from "next/server";
import type { PlanTier } from "@prisma/client";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { PLAN_LIMITS } from "@/lib/subscription-limits";
import {
  getEffectivePlan,
  getEffectiveSubscriptionStatus,
  isTrialSubscription,
  requireOrgSubscription,
} from "@/lib/subscriptions";
import { getStripe, isStripeConfigured, STRIPE_PRICE_IDS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { apiError, readJsonBody } from "@/lib/api-security";

const BILLING_INTERVAL_DAYS = {
  month: 30,
  semi_annual: 180,
  year: 365,
} as const;

type BillingInterval = keyof typeof BILLING_INTERVAL_DAYS;

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
    const effectivePlan = getEffectivePlan(subscription);
    const memberCount = await prisma.member.count({ where: { organizationId: orgId } });
    const pendingInvites = await prisma.workspaceInvite.count({
      where: { organizationId: orgId, status: "PENDING", expiresAt: { gt: new Date() } },
    });

    return NextResponse.json({
      data: {
        plan: effectivePlan,
        status: getEffectiveSubscriptionStatus(subscription),
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        memberCount,
        pendingInvites,
        limits: PLAN_LIMITS[effectivePlan],
        plans: (["FREE", "PRO"] as PlanTier[]).map((plan) => ({
          plan,
          ...PLAN_LIMITS[plan],
        })),
        stripeConfigured: isStripeConfigured(),
        hasStripeCustomer: !!subscription.stripeCustomerId,
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

    if (!orgId || plan !== "PRO" || !(interval in BILLING_INTERVAL_DAYS)) {
      return NextResponse.json({ error: "Invalid orgId, plan, or interval" }, { status: 400 });
    }

    const member = await requireOrgMembership(orgId, session.user.id);
    if (member.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stripe = getStripe();
    const priceMap: Record<string, string> = {
      month: STRIPE_PRICE_IDS.PRO_MONTHLY,
      semi_annual: STRIPE_PRICE_IDS.PRO_SEMI_ANNUAL,
      year: STRIPE_PRICE_IDS.PRO_ANNUAL,
    };
    const priceId = priceMap[interval];

    const allowDevUpgrade =
      process.env.NODE_ENV !== "production" || process.env.ENABLE_DEV_BILLING === "true";

    if (!stripe || !priceId) {
      if (!allowDevUpgrade) {
        throw new Error("Billing is not configured");
      }

      const currentPeriodEnd = new Date(Date.now() + BILLING_INTERVAL_DAYS[interval] * 86400000);
      const updated = await prisma.subscription.upsert({
        where: { organizationId: orgId },
        update: { plan, status: "ACTIVE", currentPeriodEnd },
        create: {
          organizationId: orgId,
          plan,
          status: "ACTIVE",
          currentPeriodEnd,
        },
      });
      return NextResponse.json({
        data: { plan: updated.plan, mode: "dev-upgrade" },
        message: "อัปเกรดแผนแล้ว (โหมด dev — ไม่มี Stripe)",
      });
    }

    const subscription = await requireOrgSubscription(orgId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    let customerId = subscription.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name,
        metadata: { orgId },
      });
      customerId = customer.id;
      await prisma.subscription.update({
        where: { organizationId: orgId },
        data: { stripeCustomerId: customerId },
      });
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["promptpay"],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/${orgId}/settings/billing?success=1`,
      cancel_url: `${baseUrl}/${orgId}/settings/billing?canceled=1`,
      metadata: { orgId, plan, interval },
      subscription_data: {
        metadata: { orgId, plan, interval },
      },
    });

    return NextResponse.json({ data: { url: checkout.url, mode: "stripe" } });
  } catch (error) {
    return apiError(error, "Failed to start checkout");
  }
}
