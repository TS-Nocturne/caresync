import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

const BILLING_INTERVAL_DAYS = {
  month: 30,
  semi_annual: 180,
  year: 365,
} as const;

type BillingInterval = keyof typeof BILLING_INTERVAL_DAYS;

function isBillingInterval(value: unknown): value is BillingInterval {
  return typeof value === "string" && value in BILLING_INTERVAL_DAYS;
}

function priceIdForInterval(interval: BillingInterval) {
  if (interval === "month") return STRIPE_PRICE_IDS.PRO_MONTHLY;
  if (interval === "semi_annual") return STRIPE_PRICE_IDS.PRO_SEMI_ANNUAL;
  return STRIPE_PRICE_IDS.PRO_ANNUAL;
}

function fallbackPeriodEnd(interval: BillingInterval) {
  return new Date(Date.now() + BILLING_INTERVAL_DAYS[interval] * 86400000);
}

async function getStripeSubscriptionDetails(subscriptionId: string | null) {
  const stripe = getStripe();
  if (!stripe || !subscriptionId) return null;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const raw = subscription as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ price?: { id?: string } }> };
  };

  return {
    currentPeriodEnd:
      typeof raw.current_period_end === "number"
        ? new Date(raw.current_period_end * 1000)
        : null,
    priceId: raw.items?.data?.[0]?.price?.id ?? null,
  };
}

async function notifyOwner(orgId: string, plan: string, currentPeriodEnd: Date) {
  try {
    const ownerMember = await prisma.member.findFirst({
      where: { organizationId: orgId, role: "owner" },
      include: { user: { include: { accounts: true } } },
    });

    const lineAccount = ownerMember?.user.accounts.find((acc) => acc.providerId === "line");
    if (!lineAccount?.accountId) return;

    const { sendLinePushMessage } = await import("@/lib/line-push");
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const formattedDate = currentPeriodEnd.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const message = `ชำระเงินสำเร็จ\nแพ็กเกจ: ${plan}\nหมดอายุ: ${formattedDate}\nWorkspace: ${org?.name || orgId}`;
    await sendLinePushMessage(lineAccount.accountId, message);
  } catch (error) {
    console.error("[billing/webhook] owner notification failed", error);
  }
}

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orgId = session.metadata?.orgId;
    const plan = session.metadata?.plan;
    const interval = session.metadata?.interval;

    if (typeof orgId !== "string" || plan !== "PRO" || !isBillingInterval(interval)) {
      return NextResponse.json({ received: true });
    }

    const expectedPriceId = priceIdForInterval(interval);
    if (!expectedPriceId) {
      return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
    }

    const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
    const stripeSubId = typeof session.subscription === "string" ? session.subscription : null;
    const stripeDetails = await getStripeSubscriptionDetails(stripeSubId);

    if (stripeDetails?.priceId && stripeDetails.priceId !== expectedPriceId) {
      return NextResponse.json({ error: "Invalid subscription price" }, { status: 400 });
    }

    const currentPeriodEnd = stripeDetails?.currentPeriodEnd ?? fallbackPeriodEnd(interval);

    const subscription = await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: {
        plan,
        status: "ACTIVE",
        stripeCustomerId: stripeCustomerId ?? undefined,
        stripeSubId: stripeSubId ?? undefined,
        stripePriceId: stripeDetails?.priceId ?? expectedPriceId,
        currentPeriodEnd,
      },
      create: {
        organizationId: orgId,
        plan,
        status: "ACTIVE",
        stripeCustomerId: stripeCustomerId ?? undefined,
        stripeSubId: stripeSubId ?? undefined,
        stripePriceId: stripeDetails?.priceId ?? expectedPriceId,
        currentPeriodEnd,
      },
    });

    await notifyOwner(orgId, subscription.plan, currentPeriodEnd);
  }

  if (event.type === "customer.subscription.updated" || event.type === "invoice.paid") {
    const obj = event.data.object as unknown as {
      subscription?: string;
      id?: string;
      status?: string;
    };
    const stripeSubId = event.type === "invoice.paid" ? obj.subscription : obj.id;
    if (typeof stripeSubId === "string") {
      const stripeDetails = await getStripeSubscriptionDetails(stripeSubId);
      if (stripeDetails?.currentPeriodEnd) {
        await prisma.subscription.updateMany({
          where: { stripeSubId },
          data: {
            status: "ACTIVE",
            stripePriceId: stripeDetails.priceId ?? undefined,
            currentPeriodEnd: stripeDetails.currentPeriodEnd,
          },
        });
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as unknown as { id?: string };
    if (typeof subscription.id === "string") {
      await prisma.subscription.updateMany({
        where: { stripeSubId: subscription.id },
        data: { status: "CANCELED" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
