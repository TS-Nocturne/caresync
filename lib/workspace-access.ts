import { prisma } from "./prisma";
import {
  canAccessBilling,
  canReadMedicalHistory,
  resolveCaregiverPermissions,
  type Permission,
  type ShiftType,
} from "./permissions";

export type PortalRoute = "caregiver" | "family" | "alert" | "dashboard" | "settings" | "consent";

export interface PortalAccess {
  orgId: string;
  orgRole: string;
  isOwner: boolean;
  isAdmin: boolean;
  isCaregiver: boolean;
  isFamily: boolean;
  canAccessCaregiver: boolean;
  canAccessFamily: boolean;
  canAccessAlert: boolean;
  canAccessDashboard: boolean;
  canManageTeam: boolean;
  canAccessBilling: boolean;
  canReadMedicalHistory: boolean;
  permissions: Permission[];
  shiftType: ShiftType | null;
  isTemporaryCaregiver: boolean;
  homePath: string;
  roleLabel: string;
}

export async function getPortalAccess(
  orgId: string,
  userId: string
): Promise<PortalAccess | null> {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });

  if (!member) return null;

  const isOwner = member.role === "owner";
  const isAdmin = member.role === "admin";

  const caregiverLink = await prisma.patientCaregiver.findFirst({
    where: { userId, patient: { organizationId: orgId } },
  });

  const familyLink = await prisma.patientFamily.findFirst({
    where: { userId, patient: { organizationId: orgId } },
  });

  const isCaregiver = Boolean(caregiverLink);
  const isFamily = Boolean(familyLink);

  const permissions = caregiverLink
    ? resolveCaregiverPermissions(
        caregiverLink.permissions,
        caregiverLink.shiftType as ShiftType,
        caregiverLink.isTemporary
      )
    : isOwner || isAdmin
      ? resolveCaregiverPermissions([], "FULL", false)
      : [];

  const canAccessCaregiver = isCaregiver || isOwner || isAdmin;
  const canAccessFamily = isFamily || isOwner || isAdmin;
  const canAccessAlert = isCaregiver || isOwner || isAdmin;
  const canAccessDashboard = isOwner || isAdmin;
  const canManageTeam = isOwner;
  const billingAccess = canAccessBilling(permissions, isOwner, isAdmin);
  const medicalHistoryAccess = canReadMedicalHistory(permissions, isOwner);

  let homePath = `/${orgId}/dashboard`;
  if (isOwner || isAdmin) {
    homePath = `/${orgId}/dashboard`;
  } else if (isCaregiver && !isFamily) {
    homePath = `/${orgId}/caregiver`;
  } else if (isFamily) {
    homePath = `/${orgId}/family`;
  }

  let roleLabel = "สมาชิก";
  if (isOwner) roleLabel = "แอดมิน (เจ้าของแพลน)";
  else if (isAdmin) roleLabel = "ผู้ดูแลระบบ";
  else if (caregiverLink?.isTemporary) roleLabel = "พยาบาลชั่วคราว";
  else if (caregiverLink?.shiftType === "MORNING") roleLabel = "พยาบาลกะเช้า";
  else if (isCaregiver && isFamily) roleLabel = "ผู้ดูแล + ครอบครัว";
  else if (isCaregiver) roleLabel = "พยาบาล/ผู้ดูแล";
  else if (isFamily) roleLabel = "ครอบครัว";

  return {
    orgId,
    orgRole: member.role,
    isOwner,
    isAdmin,
    isCaregiver,
    isFamily,
    canAccessCaregiver,
    canAccessFamily,
    canAccessAlert,
    canAccessDashboard,
    canManageTeam,
    canAccessBilling: billingAccess,
    canReadMedicalHistory: medicalHistoryAccess,
    permissions,
    shiftType: (caregiverLink?.shiftType as ShiftType) ?? null,
    isTemporaryCaregiver: caregiverLink?.isTemporary ?? false,
    homePath,
    roleLabel,
  };
}

export function canAccessRoute(access: PortalAccess, route: PortalRoute) {
  switch (route) {
    case "caregiver":
      return access.canAccessCaregiver;
    case "family":
      return access.canAccessFamily;
    case "alert":
      return access.canAccessAlert;
    case "dashboard":
      return access.canAccessDashboard;
    case "settings":
      return access.canManageTeam;
    case "consent":
      return access.canAccessFamily || access.isOwner;
    default:
      return false;
  }
}

export async function requirePortalAccess(orgId: string, userId: string, route: PortalRoute) {
  const access = await getPortalAccess(orgId, userId);
  if (!access) throw new Error("Forbidden");
  if (!canAccessRoute(access, route)) throw new Error("Forbidden");
  return access;
}

export async function getAccessiblePatientIds(orgId: string, userId: string) {
  const access = await getPortalAccess(orgId, userId);
  if (!access) return undefined;
  if (access.isOwner || access.isAdmin) return null;

  const [caregiverLinks, familyLinks] = await Promise.all([
    prisma.patientCaregiver.findMany({
      where: { userId, patient: { organizationId: orgId } },
      select: { patientId: true },
    }),
    prisma.patientFamily.findMany({
      where: { userId, patient: { organizationId: orgId } },
      select: { patientId: true },
    }),
  ]);

  return [...new Set([...caregiverLinks, ...familyLinks].map((link) => link.patientId))];
}

export async function canAccessPatient(orgId: string, userId: string, patientId: string) {
  const patientIds = await getAccessiblePatientIds(orgId, userId);
  if (patientIds === undefined) return false;
  if (patientIds === null) {
    const access = await getPortalAccess(orgId, userId);
    return Boolean(access?.isOwner || access?.isAdmin);
  }
  return patientIds.includes(patientId);
}

export async function requirePatientAccess(orgId: string, userId: string, patientId: string) {
  if (!(await canAccessPatient(orgId, userId, patientId))) {
    throw new Error("Forbidden");
  }
}

export async function getPatientWhereForUser(orgId: string, userId: string) {
  const patientIds = await getAccessiblePatientIds(orgId, userId);
  if (patientIds === undefined) throw new Error("Forbidden");
  if (patientIds === null) return { organizationId: orgId };
  return { organizationId: orgId, id: { in: patientIds } };
}

export async function getDefaultOrgRedirect(userId: string) {
  const membership = await prisma.member.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) return "/onboarding";

  const access = await getPortalAccess(membership.organizationId, userId);
  return access?.homePath ?? `/${membership.organizationId}/dashboard`;
}
