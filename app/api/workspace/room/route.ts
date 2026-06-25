import { NextResponse } from "next/server";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { apiError, readJsonBody } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<{ orgId?: string; confirmName?: string }>(request);
    const orgId = body.orgId?.trim();
    const confirmName = body.confirmName?.trim();

    if (!orgId || !confirmName) {
      return NextResponse.json({ error: "Invalid orgId or confirmation name" }, { status: 400 });
    }

    const member = await requireOrgMembership(orgId, session.user.id);
    if (member.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, deletedAt: true },
    });

    if (!organization) {
      throw new Error("Not found");
    }

    if (organization.deletedAt) {
      return NextResponse.json({ data: { deleted: true } });
    }

    if (organization.name !== confirmName) {
      return NextResponse.json({ error: "Room name confirmation does not match" }, { status: 400 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
      select: { stripeSubId: true },
    });
    const stripe = getStripe();
    if (stripe && subscription?.stripeSubId) {
      await stripe.subscriptions.update(subscription.stripeSubId, {
        cancel_at_period_end: true,
      });
    }

    await prisma.$transaction([
      prisma.organization.update({
        where: { id: orgId },
        data: {
          deletedAt: new Date(),
          deletedById: session.user.id,
        },
      }),
      prisma.workspaceInvite.updateMany({
        where: { organizationId: orgId, status: "PENDING" },
        data: { status: "REVOKED" },
      }),
      prisma.subscription.updateMany({
        where: { organizationId: orgId },
        data: { cancelAtPeriodEnd: true },
      }),
    ]);

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return apiError(error, "Failed to delete room");
  }
}
