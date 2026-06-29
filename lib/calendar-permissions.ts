import type { PortalAccess } from "./workspace-access";
import type { EventType, CalendarEvent } from "@prisma/client";

export function canCreateEvent(access: PortalAccess | null, eventType: EventType): boolean {
  if (!access) return false;

  // Admin/Owner can do everything
  if (access.orgRole === "owner" || access.orgRole === "admin") return true;

  if (access.isFamily) {
    // Family members can add visits, family appointments, and general notes.
    return eventType === "VISIT" || eventType === "MEDICAL_APPOINTMENT" || eventType === "OTHER";
  }

  if (access.isCaregiver) {
    // Caregivers can create Medical, Shift, or Other events
    return eventType === "MEDICAL_APPOINTMENT" || eventType === "NURSE_SHIFT" || eventType === "OTHER";
  }

  return false;
}

export function canEditOrDeleteEvent(access: PortalAccess | null, userId: string, event: Pick<CalendarEvent, "creatorId">): boolean {
  if (!access) return false;

  // Admin/Owner can edit/delete any event
  if (access.orgRole === "owner" || access.orgRole === "admin") return true;

  // Normal members can only edit their own events
  return userId === event.creatorId;
}

export function canClaimEvent(access: PortalAccess | null, userId: string, event: Pick<CalendarEvent, "type" | "status" | "creatorId">): boolean {
  if (!access) return false;

  // Only FAMILY_REQUEST events in OPEN status can be claimed
  if (event.type !== "FAMILY_REQUEST" || event.status !== "OPEN") return false;

  // Only Family members can claim Family Requests (or Admins acting as Family)
  if (!access.isFamily && access.orgRole !== "owner" && access.orgRole !== "admin") return false;

  // Cannot claim your own request
  if (userId === event.creatorId) return false;

  return true;
}
