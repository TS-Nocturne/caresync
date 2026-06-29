import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deletePatientData, shouldDeletePatientsForExpiredAccount } from "@/lib/patient-data-retention";
import type { UserSubscription } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
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

  return NextResponse.json({
    checked: true,
    organizationsChecked: owners.length,
    organizationsDeletedFrom: results.length,
    deletedPatients: results.reduce((sum, result) => sum + result.deletedPatients, 0),
    results,
  });
}
