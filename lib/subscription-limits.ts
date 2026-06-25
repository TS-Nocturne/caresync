import type { PlanTier } from "@prisma/client";

/**
 * CareSync has a single paid plan ("PRO") with 3 billing intervals.
 * FREE is only used as a fallback state (no subscription found).
 * New workspaces always start with a 14-day PRO trial.
 */
export const PLAN_LIMITS: Record<
  PlanTier,
  { maxMembers: number; maxPendingInvites: number; label: string; priceLabel: string }
> = {
  FREE: {
    maxMembers: 0,
    maxPendingInvites: 0,
    label: "ไม่มีแพ็กเกจ",
    priceLabel: "หมดช่วงทดลองใช้หรือยังไม่มีแพ็กเกจ",
  },
  PRO: {
    maxMembers: Infinity,
    maxPendingInvites: Infinity,
    label: "Pro",
    priceLabel: "฿299/เดือน — ไม่จำกัดสมาชิก",
  },
};

export function canAddMember(_plan: PlanTier, _currentMemberCount: number) {
  void _plan;
  void _currentMemberCount;
  // Single-plan model — no member limits
  return true;
}

export function canCreateInvite(_plan: PlanTier, _pendingInviteCount: number) {
  void _plan;
  void _pendingInviteCount;
  // Single-plan model — no invite limits
  return true;
}
