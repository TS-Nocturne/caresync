import type { PortalRole } from "@prisma/client";
import { prisma } from "./prisma";
import { canAddMember, canCreateInvite } from "./subscription-limits";
import { requireOrgSubscription } from "./subscriptions";

const INVITE_TTL_DAYS = 7;

export async function getOrgSubscription(orgId: string) {
  return prisma.subscription.findUnique({ where: { organizationId: orgId } });
}

export async function assertCanInvite(orgId: string) {
  const subscription = await requireOrgSubscription(orgId);
  const [memberCount, pendingInvites] = await Promise.all([
    prisma.member.count({ where: { organizationId: orgId } }),
    prisma.workspaceInvite.count({
      where: { organizationId: orgId, status: "PENDING", expiresAt: { gt: new Date() } },
    }),
  ]);

  if (!canAddMember(subscription.plan, memberCount)) {
    throw new Error(
      `แผน ${subscription.plan} รองรับสมาชิกได้ไม่เกิน ${memberCount} คน — กรุณาอัปเกรดแผนเพื่อเชิญพยาบาลหรือครอบครัว`
    );
  }

  if (!canCreateInvite(subscription.plan, pendingInvites)) {
    throw new Error("แผนปัจจุบันไม่รองรับการสร้างลิงก์เชิญ — กรุณาอัปเกรดแผน");
  }

  return subscription;
}

export async function createWorkspaceInvite({
  orgId,
  createdById,
  portalRole,
  patientId,
  relationLabel,
}: {
  orgId: string;
  createdById: string;
  portalRole: PortalRole;
  patientId?: string | null;
  relationLabel?: string | null;
}) {
  await assertCanInvite(orgId);

  const patient =
    patientId != null
      ? await prisma.patient.findFirst({ where: { id: patientId, organizationId: orgId } })
      : await prisma.patient.findFirst({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } });

  if (!patient) {
    throw new Error("ยังไม่มีผู้ป่วยใน workspace — เพิ่มผู้ป่วยก่อนสร้างลิงก์เชิญ");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  return prisma.workspaceInvite.create({
    data: {
      organizationId: orgId,
      portalRole,
      patientId: patient.id,
      relationLabel: relationLabel ?? null,
      createdById,
      expiresAt,
    },
    include: {
      organization: { select: { name: true } },
    },
  });
}

export async function acceptWorkspaceInvite(token: string, userId: string) {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invite || invite.status !== "PENDING") {
    throw new Error("ลิงก์เชิญไม่ถูกต้องหรือถูกใช้แล้ว");
  }

  if (invite.expiresAt < new Date()) {
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("ลิงก์เชิญหมดอายุแล้ว — ขอลิงก์ใหม่จากเจ้าของห้อง");
  }

  const subscription = await requireOrgSubscription(invite.organizationId);
  const memberCount = await prisma.member.count({
    where: { organizationId: invite.organizationId },
  });

  const existingMember = await prisma.member.findUnique({
    where: {
      userId_organizationId: { userId, organizationId: invite.organizationId },
    },
  });

  if (!existingMember && !canAddMember(subscription.plan, memberCount)) {
    throw new Error("ห้องนี้เต็มแล้ว — ติดต่อเจ้าของห้องเพื่ออัปเกรดแผน");
  }

  const patientId =
    invite.patientId ??
    (
      await prisma.patient.findFirst({
        where: { organizationId: invite.organizationId },
        orderBy: { createdAt: "asc" },
      })
    )?.id;

  if (!patientId) throw new Error("ไม่พบผู้ป่วยใน workspace");

  await prisma.$transaction(async (tx) => {
    if (!existingMember) {
      await tx.member.create({
        data: {
          userId,
          organizationId: invite.organizationId,
          role: "member",
        },
      });
    }

    if (invite.portalRole === "CAREGIVER") {
      await tx.patientCaregiver.upsert({
        where: { patientId_userId: { patientId, userId } },
        update: {},
        create: { patientId, userId },
      });
    } else {
      const hasPrimary = await tx.patientFamily.findFirst({
        where: { patientId, isPrimary: true },
      });
      await tx.patientFamily.upsert({
        where: { patientId_userId: { patientId, userId } },
        update: {},
        create: {
          patientId,
          userId,
          relation: invite.relationLabel ?? "ครอบครัว",
          isPrimary: !hasPrimary,
        },
      });
    }

    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedById: userId,
        acceptedAt: new Date(),
      },
    });

    await tx.activityLog.create({
      data: {
        organizationId: invite.organizationId,
        type: "SYSTEM_NOTE",
        title:
          invite.portalRole === "CAREGIVER"
            ? "พยาบาล/ผู้ดูแลเข้าร่วมห้อง"
            : "สมาชิกครอบครัวเข้าร่วมห้อง",
        description: `ยอมรับคำเชิญเข้า ${invite.organization.name}`,
        userId,
      },
    });
  });

  return { organizationId: invite.organizationId, portalRole: invite.portalRole };
}

export async function revokeWorkspaceInvite(inviteId: string, orgId: string) {
  const invite = await prisma.workspaceInvite.findFirst({
    where: { id: inviteId, organizationId: orgId, status: "PENDING" },
  });
  if (!invite) throw new Error("ไม่พบคำเชิญ");
  return prisma.workspaceInvite.update({
    where: { id: inviteId },
    data: { status: "REVOKED" },
  });
}

export async function revokeMemberAccess(orgId: string, targetUserId: string, actorUserId: string) {
  if (targetUserId === actorUserId) {
    throw new Error("ไม่สามารถลบตัวเองออกจากห้องได้");
  }

  const targetMember = await prisma.member.findUnique({
    where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
  });

  if (!targetMember) throw new Error("ไม่พบสมาชิก");
  if (targetMember.role === "owner") throw new Error("ไม่สามารถลบเจ้าของห้องได้");

  await prisma.$transaction(async (tx) => {
    await tx.patientCaregiver.deleteMany({
      where: { userId: targetUserId, patient: { organizationId: orgId } },
    });
    await tx.patientFamily.deleteMany({
      where: { userId: targetUserId, patient: { organizationId: orgId } },
    });
    await tx.member.delete({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
    });
    await tx.activityLog.create({
      data: {
        organizationId: orgId,
        type: "SYSTEM_NOTE",
        title: "เพิกถอนสิทธิ์สมาชิก",
        description: `เจ้าของห้องลบสิทธิ์การเข้าถึงของสมาชิก`,
        userId: actorUserId,
      },
    });
  });
}

export function buildInviteUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/invite/${token}`;
}
