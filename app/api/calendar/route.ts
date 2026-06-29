import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-server";
import { getAccessiblePatientIds, getPortalAccess, requirePatientAccess } from "@/lib/workspace-access";
import { canCreateEvent } from "@/lib/calendar-permissions";
import { apiError, readJsonBody, sanitizeText } from "@/lib/api-security";
import type { EventType, Prisma } from "@prisma/client";
import { requireWritableSubscription } from "@/lib/subscriptions";

const EVENT_TYPES: EventType[] = [
  "VISIT",
  "MEDICAL_APPOINTMENT",
  "NURSE_SHIFT",
  "FAMILY_REQUEST",
  "OTHER",
];

type CalendarCreateBody = {
  orgId?: string;
  patientId?: string | null;
  title?: string;
  description?: string | null;
  type?: EventType;
  startTime?: string;
  endTime?: string;
};

function parseEventDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventTypeLabel(type: EventType) {
  if (type === "VISIT") return "การเข้าเยี่ยม/ครอบครัว";
  if (type === "MEDICAL_APPOINTMENT") return "นัดหมายทางการแพทย์";
  if (type === "NURSE_SHIFT") return "กิจกรรมการพยาบาล";
  if (type === "FAMILY_REQUEST") return "คำร้องขออาสาสมัคร";
  return "กิจกรรม";
}

async function notifyCrossPortalEvent({
  orgId,
  creatorId,
  notify,
  type,
  title,
  startTime,
}: {
  orgId: string;
  creatorId: string;
  notify: "CAREGIVER" | "FAMILY";
  type: EventType;
  title: string;
  startTime: Date;
}) {
  const users =
    notify === "CAREGIVER"
      ? await prisma.patientCaregiver.findMany({
          where: { patient: { organizationId: orgId }, userId: { not: creatorId } },
          include: { user: { include: { accounts: true } } },
          distinct: ["userId"],
        })
      : await prisma.patientFamily.findMany({
          where: { patient: { organizationId: orgId }, userId: { not: creatorId } },
          include: { user: { include: { accounts: true } } },
          distinct: ["userId"],
        });

  const lineIds = users
    .flatMap((entry) => entry.user.accounts.filter((account) => account.providerId === "line").map((account) => account.accountId))
    .filter(Boolean);
  const uniqueLineIds = [...new Set(lineIds)];

  if (uniqueLineIds.length === 0) return;

  const { sendLinePushMessage } = await import("@/lib/line-push");
  const targetLabel = notify === "CAREGIVER" ? "ผู้ดูแล" : "ครอบครัว";
  const formattedDate = startTime.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const message = `🔔 ปฏิทิน CareSync: มี${eventTypeLabel(type)}ใหม่\n${title}\nเวลา: ${formattedDate}\nแจ้งเตือนถึงฝั่ง${targetLabel}เพื่อเตรียมการล่วงหน้า`;

  for (const lineId of uniqueLineIds) {
    await sendLinePushMessage(lineId, message);
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const access = await getPortalAccess(orgId, session.user.id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const accessiblePatientIds = await getAccessiblePatientIds(orgId, session.user.id);

    let where: Prisma.CalendarEventWhereInput = { organizationId: orgId };
    if (accessiblePatientIds !== null && accessiblePatientIds !== undefined) {
      where = {
        ...where,
        OR: [{ patientId: null }, { patientId: { in: accessiblePatientIds } }],
      };
    }

    if (startStr && endStr) {
      where = {
        ...where,
        AND: [
          { startTime: { lt: new Date(endStr) } },
          { endTime: { gt: new Date(startStr) } },
        ],
      };
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true, image: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ data: events });
  } catch (error) {
    return apiError(error, "Failed to fetch calendar events");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<CalendarCreateBody>(request);
    const { orgId, patientId, title, description, type, startTime, endTime } = body;
    const parsedStart = parseEventDate(startTime);
    const parsedEnd = parseEventDate(endTime);

    if (!orgId || !title || !type || !parsedStart || !parsedEnd) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!EVENT_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }
    if (parsedEnd <= parsedStart) {
      return NextResponse.json({ error: "endTime must be after startTime" }, { status: 400 });
    }

    const access = await getPortalAccess(orgId, session.user.id);
    if (!access || !canCreateEvent(access, type)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await requireWritableSubscription(orgId);
    if (patientId) {
      await requirePatientAccess(orgId, session.user.id, patientId);
    }

    // Determine status based on type and assignment
    let status: "OPEN" | "ASSIGNED" = "ASSIGNED";
    let assigneeId: string | null = session.user.id;

    if (type === "FAMILY_REQUEST") {
      status = "OPEN";
      assigneeId = null;
    }

    const event = await prisma.calendarEvent.create({
      data: {
        organizationId: orgId,
        patientId: patientId ?? null,
        title: sanitizeText(title, 200),
        description: sanitizeText(description, 1000) || null,
        type,
        status,
        startTime: parsedStart,
        endTime: parsedEnd,
        creatorId: session.user.id,
        assigneeId,
      },
      include: {
        creator: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    // If FAMILY_REQUEST, trigger Push Notifications
    if (type === "FAMILY_REQUEST") {
      try {
      // Find all Family members in this organization
      const familyMembers = await prisma.workspaceInvite.findMany({
        where: { organizationId: orgId, portalRole: "FAMILY", status: "ACCEPTED" },
        include: { acceptedBy: { include: { accounts: true } } },
      });

      // Also get the owner
      const ownerMember = await prisma.member.findFirst({
        where: { organizationId: orgId, role: "owner" },
        include: { user: { include: { accounts: true } } },
      });

      const usersToNotify = [ownerMember?.user, ...familyMembers.map(m => m.acceptedBy)].filter(Boolean);
      const lineIds = usersToNotify
        .flatMap(u => u?.accounts.filter(a => a.providerId === "line").map(a => a.accountId) || [])
        .filter(id => id !== undefined);

      // Distinct LINE IDs
      const uniqueLineIds = [...new Set(lineIds)];
      
      if (uniqueLineIds.length > 0) {
        const { sendLinePushMessage } = await import("@/lib/line-push");
        const formattedDate = parsedStart.toLocaleString("th-TH");
        const message = `🔔 คำร้องขอความช่วยเหลือใหม่: ${title}\nเวลา: ${formattedDate}\n\nใครสะดวก สามารถเข้าไปกดรับงานในปฏิทิน CareFlow ได้เลยครับ!`;
        
        for (const lineId of uniqueLineIds) {
          if (lineId) await sendLinePushMessage(lineId, message);
        }
      }
      } catch (notificationError) {
        console.error("[calendar] Failed to send family-request notification", notificationError);
      }
    }

    if (type !== "FAMILY_REQUEST") {
      try {
        await notifyCrossPortalEvent({
          orgId,
          creatorId: session.user.id,
          notify: access.isFamily ? "CAREGIVER" : "FAMILY",
          type,
          title: sanitizeText(title, 200),
          startTime: parsedStart,
        });
      } catch (notificationError) {
        console.error("[calendar] Failed to send cross-portal notification", notificationError);
      }
    }

    return NextResponse.json({ data: event });
  } catch (error) {
    return apiError(error, "Failed to create calendar event");
  }
}
