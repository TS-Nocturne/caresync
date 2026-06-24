import type { PlanTier } from "@prisma/client";

export const PLAN_LIMITS: Record<
  PlanTier,
  { maxMembers: number; maxPendingInvites: number; label: string; priceLabel: string }
> = {
  FREE: {
    maxMembers: 1,
    maxPendingInvites: 0,
    label: "Free",
    priceLabel: "ฟรี — เจ้าของห้องเท่านั้น",
  },
  BASIC: {
    maxMembers: 8,
    maxPendingInvites: 20,
    label: "Basic",
    priceLabel: "฿990/เดือน — เชิญพยาบาลและครอบครัวได้",
  },
  PRO: {
    maxMembers: 999,
    maxPendingInvites: 999,
    label: "Pro",
    priceLabel: "฿2,490/เดือน — ไม่จำกัดสมาชิก",
  },
};

export function canAddMember(plan: PlanTier, currentMemberCount: number) {
  return currentMemberCount < PLAN_LIMITS[plan].maxMembers;
}

export function canCreateInvite(plan: PlanTier, pendingInviteCount: number) {
  return pendingInviteCount < PLAN_LIMITS[plan].maxPendingInvites;
}
