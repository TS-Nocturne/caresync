import { ReactNode } from "react";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import SoftLockWrapper from "@/app/components/ui/SoftLockWrapper";
import Navigation from "@/app/components/ui/Navigation";
import { redirect } from "next/navigation";

type SessionUserWithConsent = {
  termsAccepted?: boolean;
};

export default async function OrgLayout(props: {
  children: ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await props.params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Fallback protection: if they somehow get past dashboard checks
  if ((session.user as SessionUserWithConsent).termsAccepted === false) {
    redirect("/consent");
  }

  const [org, member, sub] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, deletedAt: true } }),
    prisma.member.findUnique({ where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } } }),
    prisma.subscription.findUnique({ where: { organizationId: orgId } })
  ]);

  if (!org || !member || org.deletedAt) {
    redirect("/dashboard");
  }

  const isOwner = member.role === "owner";
  
  const plan = sub?.plan || "FREE";
  const status = sub?.status || "ACTIVE";
  
  let isGracePeriod = false;
  let isReadOnly = false;
  let graceHoursRemaining = 0;
  let lockReason: "not_subscribed" | "expired" = "expired";

  if (plan === "FREE") {
    isReadOnly = true;
    lockReason = "not_subscribed";
  } else if (status === "PAST_DUE" || (sub?.currentPeriodEnd && sub.currentPeriodEnd < new Date())) {
    const expiredAt = sub?.currentPeriodEnd ? sub.currentPeriodEnd.getTime() : 0;
    const now = new Date().getTime();
    
    if (expiredAt > 0) {
      const hoursExpired = (now - expiredAt) / (1000 * 60 * 60);
      if (hoursExpired <= 48 && hoursExpired >= 0) {
        isGracePeriod = true;
        graceHoursRemaining = Math.max(1, Math.floor(48 - hoursExpired));
      } else {
        isReadOnly = true;
        lockReason = "expired";
      }
    } else {
      isReadOnly = true;
      lockReason = "expired";
    }
  }

  return (
    <>
      <Navigation />
      <SoftLockWrapper
        isGracePeriod={isGracePeriod}
        isReadOnly={isReadOnly}
        graceHoursRemaining={graceHoursRemaining}
        orgId={orgId}
        orgName={org.name}
        isOwner={isOwner}
        lockReason={lockReason}
      >
        {props.children}
      </SoftLockWrapper>
    </>
  );
}
