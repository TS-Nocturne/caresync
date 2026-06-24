import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-server";
import { getPortalAccess, requirePatientAccess } from "@/lib/workspace-access";
import { canEditOrDeleteEvent, canClaimEvent } from "@/lib/calendar-permissions";
import { apiError, readJsonBody, sanitizeText } from "@/lib/api-security";
import type { EventType } from "@prisma/client";

const EVENT_TYPES: EventType[] = [
  "VISIT",
  "MEDICAL_APPOINTMENT",
  "NURSE_SHIFT",
  "FAMILY_REQUEST",
  "OTHER",
];

type CalendarUpdateBody = {
  orgId?: string;
  action?: "claim";
  patientId?: string | null;
  title?: string;
  description?: string | null;
  type?: EventType;
  startTime?: string;
  endTime?: string;
};

function parseEventDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function PUT(request: Request, props: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await props.params;
    const session = await requireSession();
    const body = await readJsonBody<CalendarUpdateBody>(request);
    const { orgId, action } = body;

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const access = await getPortalAccess(orgId, session.user.id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const event = await prisma.calendarEvent.findUnique({ where: { id: eventId, organizationId: orgId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Handle Claim action
    if (action === "claim") {
      if (!canClaimEvent(access, session.user.id, event)) {
        return NextResponse.json({ error: "Cannot claim this event" }, { status: 403 });
      }

      const updated = await prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          status: "ASSIGNED",
          assigneeId: session.user.id,
        },
        include: { assignee: { select: { id: true, name: true, image: true } } },
      });

      return NextResponse.json({ data: updated });
    }

    // Handle standard update
    if (!canEditOrDeleteEvent(access, session.user.id, event)) {
      return NextResponse.json({ error: "Forbidden to edit this event" }, { status: 403 });
    }

    const updateData: {
      patientId?: string | null;
      title?: string;
      description?: string | null;
      type?: EventType;
      startTime?: Date;
      endTime?: Date;
    } = {};

    if (body.patientId !== undefined) {
      if (body.patientId) {
        await requirePatientAccess(orgId, session.user.id, body.patientId);
      }
      updateData.patientId = body.patientId;
    }
    if (body.title !== undefined) updateData.title = sanitizeText(body.title, 200);
    if (body.description !== undefined) {
      updateData.description = sanitizeText(body.description, 1000) || null;
    }
    if (body.type !== undefined) {
      if (!EVENT_TYPES.includes(body.type)) {
        return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
      }
      updateData.type = body.type;
    }

    const parsedStart = parseEventDate(body.startTime);
    const parsedEnd = parseEventDate(body.endTime);
    if (parsedStart === null || parsedEnd === null) {
      return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
    }
    if (parsedStart) updateData.startTime = parsedStart;
    if (parsedEnd) updateData.endTime = parsedEnd;

    const nextStart = updateData.startTime ?? event.startTime;
    const nextEnd = updateData.endTime ?? event.endTime;
    if (nextEnd <= nextStart) {
      return NextResponse.json({ error: "endTime must be after startTime" }, { status: 400 });
    }

    const updated = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return apiError(error, "Failed to update calendar event");
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await props.params;
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const access = await getPortalAccess(orgId, session.user.id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const event = await prisma.calendarEvent.findUnique({ where: { id: eventId, organizationId: orgId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!canEditOrDeleteEvent(access, session.user.id, event)) {
      return NextResponse.json({ error: "Forbidden to delete this event" }, { status: 403 });
    }

    await prisma.calendarEvent.delete({ where: { id: eventId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to delete calendar event");
  }
}
