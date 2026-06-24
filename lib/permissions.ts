/** Granular RBAC permission keys for caregiver access control. */

export const PERMISSIONS = {
  VITALS_READ: "vitals:read",
  VITALS_WRITE: "vitals:write",
  MEDICATIONS_READ: "medications:read",
  MEDICATIONS_WRITE: "medications:write",
  MEDICAL_HISTORY_READ: "medical_history:read",
  BILLING_READ: "billing:read",
  ALERTS_READ: "alerts:read",
  ALERTS_RESOLVE: "alerts:resolve",
  FAMILY_READ: "family:read",
  CONSENT_MANAGE: "consent:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type ShiftType = "MORNING" | "AFTERNOON" | "NIGHT" | "FULL";

const FULL_CAREGIVER: Permission[] = [
  PERMISSIONS.VITALS_READ,
  PERMISSIONS.VITALS_WRITE,
  PERMISSIONS.MEDICATIONS_READ,
  PERMISSIONS.MEDICATIONS_WRITE,
  PERMISSIONS.MEDICAL_HISTORY_READ,
  PERMISSIONS.ALERTS_READ,
  PERMISSIONS.ALERTS_RESOLVE,
  PERMISSIONS.FAMILY_READ,
];

const MORNING_SHIFT: Permission[] = FULL_CAREGIVER.filter((p) => p !== PERMISSIONS.BILLING_READ);

const TEMP_NURSE: Permission[] = [
  PERMISSIONS.VITALS_READ,
  PERMISSIONS.VITALS_WRITE,
  PERMISSIONS.MEDICATIONS_READ,
  PERMISSIONS.MEDICATIONS_WRITE,
  PERMISSIONS.ALERTS_READ,
];

export function defaultPermissionsForCaregiver(
  shiftType: ShiftType = "FULL",
  isTemporary = false
): Permission[] {
  if (isTemporary) return [...TEMP_NURSE];
  if (shiftType === "MORNING" || shiftType === "AFTERNOON" || shiftType === "NIGHT") {
    return [...MORNING_SHIFT];
  }
  return [...FULL_CAREGIVER];
}

export function resolveCaregiverPermissions(
  stored: string[] | null | undefined,
  shiftType: ShiftType = "FULL",
  isTemporary = false
): Permission[] {
  if (stored && stored.length > 0) return stored as Permission[];
  return defaultPermissionsForCaregiver(shiftType, isTemporary);
}

export function hasPermission(permissions: Permission[], required: Permission): boolean {
  return permissions.includes(required);
}

export function canAccessBilling(permissions: Permission[], isOwner: boolean, isAdmin: boolean): boolean {
  return isOwner || isAdmin || permissions.includes(PERMISSIONS.BILLING_READ);
}

export function canReadMedicalHistory(permissions: Permission[], isOwner: boolean): boolean {
  return isOwner || permissions.includes(PERMISSIONS.MEDICAL_HISTORY_READ);
}
