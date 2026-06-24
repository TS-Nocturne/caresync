import { NextResponse } from "next/server";
import type { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

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
    const plan = session.metadata?.plan as PlanTier | undefined;
    const interval = session.metadata?.interval || "month";

    if (orgId && plan) {
      // 1. Calculate how many days to add
      let daysToAdd = 30;
      if (interval === "semi_annual") daysToAdd = 180;
      if (interval === "year") daysToAdd = 365;

      // 2. Fetch current subscription to see if it's still active
      const currentSub = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
      const now = new Date();
      let baseDate = now;

      // If active and not expired, add to the current end date
      if (currentSub?.currentPeriodEnd && currentSub.currentPeriodEnd > now) {
        baseDate = currentSub.currentPeriodEnd;
      }

      const newPeriodEnd = new Date(baseDate.getTime() + daysToAdd * 86400000);

      // 3. Update or create the subscription
      await prisma.subscription.upsert({
        where: { organizationId: orgId },
        update: {
          plan,
          status: "ACTIVE",
          currentPeriodEnd: newPeriodEnd,
        },
        create: {
          organizationId: orgId,
          plan,
          status: "ACTIVE",
          stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
          currentPeriodEnd: newPeriodEnd,
        },
      });

      // 4. Send LINE Notification to the Owner
      // Find the owner of the organization
      const ownerMember = await prisma.member.findFirst({
        where: { organizationId: orgId, role: "owner" },
        include: { user: { include: { accounts: true } } },
      });

      if (ownerMember) {
        const lineAccount = ownerMember.user.accounts.find(acc => acc.providerId === "line");
        if (lineAccount?.accountId) {
          const { sendLinePushMessage } = await import("@/lib/line-push");
          const org = await prisma.organization.findUnique({ where: { id: orgId } });
          const formattedDate = newPeriodEnd.toLocaleDateString("th-TH", {
            year: "numeric", month: "long", day: "numeric"
          });
          
          const message = `✅ ชำระเงินสำเร็จ!\nระบบได้ต่ออายุการใช้งานห้องดูแล '${org?.name || orgId}'\n\nแพ็กเกจ: ${plan}\nหมดอายุ: ${formattedDate}\n\nขอบคุณที่ไว้วางใจให้ CareFlow ดูแลครับ`;
          await sendLinePushMessage(lineAccount.accountId, message);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
