import { NextResponse } from "next/server";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { apiError, readJsonBody } from "@/lib/api-security";

export async function POST(request: Request) {
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

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      throw new Error("No active Stripe customer found");
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new Error("Stripe is not configured");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${baseUrl}/${orgId}/settings/billing`,
    });

    return NextResponse.json({ data: { url: portalSession.url } });
  } catch (error) {
    return apiError(error, "Failed to create portal session");
  }
}
