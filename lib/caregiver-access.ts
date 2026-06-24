import { prisma } from "./prisma";
import {
  hasPermission,
  resolveCaregiverPermissions,
  type Permission,
  type ShiftType,
} from "./permissions";

export async function getCaregiverProfile(orgId: string, userId: string, patientId: string) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });

  if (!member) return null;

  if (member.role === "owner" || member.role === "admin") {
    return {
      isOwnerOrAdmin: true,
      permissions: resolveCaregiverPermissions([], "FULL", false),
      shiftType: "FULL" as ShiftType,
      isTemporary: false,
    };
  }

  const link = await prisma.patientCaregiver.findUnique({
    where: { patientId_userId: { patientId, userId } },
  });

  if (!link) return null;

  return {
    isOwnerOrAdmin: false,
    permissions: resolveCaregiverPermissions(
      link.permissions,
      link.shiftType as ShiftType,
      link.isTemporary
    ),
    shiftType: link.shiftType as ShiftType,
    isTemporary: link.isTemporary,
  };
}

export async function requirePermission(
  orgId: string,
  userId: string,
  patientId: string,
  permission: Permission
) {
  const profile = await getCaregiverProfile(orgId, userId, patientId);
  if (!profile) throw new Error("Forbidden");
  if (profile.isOwnerOrAdmin) return profile;
  if (!hasPermission(profile.permissions, permission)) throw new Error("Forbidden");
  return profile;
}

export async function requireCaregiverWriteAccess(orgId: string, userId: string, patientId: string) {
  return requirePermission(orgId, userId, patientId, "vitals:write");
}

export async function requireConsentAccess(orgId: string, userId: string, patientId: string) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  if (!member) throw new Error("Forbidden");

  if (member.role === "owner" || member.role === "admin") {
    return { isOwnerOrAdmin: true };
  }

  const familyLink = await prisma.patientFamily.findUnique({
    where: { patientId_userId: { patientId, userId } },
  });
  if (familyLink) return { isFamily: true };

  await requirePermission(orgId, userId, patientId, "consent:manage");
  return { isCaregiver: true };
}
