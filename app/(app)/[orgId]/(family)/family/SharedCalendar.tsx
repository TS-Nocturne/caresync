"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { format, startOfWeek, addDays } from "date-fns";
import { th } from "date-fns/locale";
import Link from "next/link";
import type { CalendarEvent } from "@/app/components/calendar/Calendar";

export default function SharedCalendar({ orgId }: { orgId: string }) {
  const { data: session } = useSession();
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); // Default to today (0=Mon, 6=Sun)
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  // Generate current week dates (Monday to Sunday)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday
  const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/calendar?orgId=${orgId}`);
      if (res.ok) {
        const json = await res.json();
        setEvents(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchEvents();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchEvents]);

  const handleClaim = async (eventId: string) => {
    setMarking(eventId);
    try {
      const res = await fetch(`/api/calendar/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, action: "claim" }),
      });
      if (res.ok) {
        fetchEvents();
      } else {
        const error = await res.json();
        alert(`ไม่สามารถรับอาสาได้: ${error.error}`);
      }
    } finally {
      setMarking(null);
    }
  };

  // Filter events for the selected day
  const selectedDate = weekDates[selectedDayIndex];
  const dayEvents = events.filter((e) => {
    const eventDate = new Date(e.startTime);
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  const openRequests = dayEvents.filter((e) => e.type === "FAMILY_REQUEST" && e.status === "OPEN");
  const scheduledEvents = dayEvents.filter((e) => !(e.type === "FAMILY_REQUEST" && e.status === "OPEN"));

  function getEventBg(event: CalendarEvent): string {
    if (event.type === "FAMILY_REQUEST") return "bg-amber-100/80 dark:bg-amber-900/30 border-amber-300";
    if (event.type === "NURSE_SHIFT") return "bg-sky-100/80 dark:bg-sky-900/30 border-sky-300";
    if (event.type === "MEDICAL_APPOINTMENT") return "bg-rose-100/80 dark:bg-rose-900/30 border-rose-300";
    if (event.type === "VISIT") return "bg-emerald-100/80 dark:bg-emerald-900/30 border-emerald-300";
    return "bg-muted border-border";
  }

  function getEventColor(event: CalendarEvent): string {
    if (event.type === "FAMILY_REQUEST") return "#f59e0b"; // amber
    if (event.type === "NURSE_SHIFT") return "#0ea5e9"; // sky
    if (event.type === "MEDICAL_APPOINTMENT") return "#f43f5e"; // rose
    if (event.type === "VISIT") return "#10b981"; // emerald
    return "#64748b"; // slate
  }

  return (
    <div className="glass-card p-4 sm:p-5 animate-fade-in relative">
      <div className="flex flex-col gap-3 mb-5 min-[520px]:flex-row min-[520px]:items-center">
        <span className="text-xl">📅</span>
        <h2 className="text-lg font-semibold">ปฏิทินร่วม</h2>
        <div className="flex flex-col gap-2 min-[520px]:ml-auto min-[520px]:flex-row min-[520px]:items-center min-[520px]:gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            สัปดาห์ {format(weekDates[0], "d")} - {format(weekDates[6], "d MMM yyyy", { locale: th })}
          </span>
          <Link
            href={`/${orgId}/calendar`}
            className="inline-flex justify-center px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors min-[520px]:shrink-0"
          >
            + เพิ่มกิจกรรม
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium">เข้าเยี่ยม</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-sky-500" />
          <span className="text-xs font-medium">พยาบาล</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="text-xs font-medium">อาสาพาไปหาหมอ</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-5 overflow-x-auto pb-1">
        {weekDates.map((date, i) => {
          const isToday =
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth();
          const isSelected = selectedDayIndex === i;
          
          // Check if this day has any events
          const hasEvents = events.some((e) => {
            const d = new Date(e.startTime);
            return d.getDate() === date.getDate() && d.getMonth() === date.getMonth();
          });

          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDayIndex(i)}
              className={`flex min-w-10 flex-col items-center p-2 rounded-xl transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md"
                  : isToday
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-foreground"
              }`}
            >
              <span className="text-[10px] font-medium opacity-70">
                {format(date, "EEEEEE", { locale: th })}
              </span>
              <span className="text-sm font-bold">{format(date, "d")}</span>
              {hasEvents && !isSelected && <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </button>
          );
        })}
      </div>

      <div className={`space-y-2 relative ${openRequests.length > 0 || scheduledEvents.length > 0 ? "min-h-[200px]" : "min-h-0"}`}>
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-xl">
            <span className="animate-spin text-2xl">⏳</span>
          </div>
        )}

        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          {format(selectedDate, "EEEE d MMM", { locale: th })}
        </h3>

        {/* OPEN REQUESTS (TASK CLAIMING) */}
        {openRequests.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              ช่วงว่าง — อาสาพาไปหาหมอได้
            </p>
            {openRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{req.title}</p>
                  <p className="text-xs font-medium mt-0.5">{req.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(req.startTime), "HH:mm")} – {format(new Date(req.endTime), "HH:mm")}
                  </p>
                </div>
                {req.creatorId !== session?.user.id && (
                  <button
                    type="button"
                    disabled={marking === req.id}
                    onClick={() => handleClaim(req.id)}
                    className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm sm:w-auto sm:shrink-0"
                  >
                    {marking === req.id ? "กำลังรับงาน..." : "🚗 อาสาเลย"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* SCHEDULED EVENTS */}
        {scheduledEvents.length > 0 ? (
          scheduledEvents
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map((event) => (
              <div
                key={event.id}
                className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${getEventBg(event)}`}
                style={{ borderLeftColor: getEventColor(event) }}
              >
                <div className="shrink-0 text-xs font-mono text-muted-foreground whitespace-nowrap mt-0.5">
                  {format(new Date(event.startTime), "HH:mm")}
                  <br />
                  {format(new Date(event.endTime), "HH:mm")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{event.title}</p>
                  <p className="text-xs mt-0.5 text-foreground/80">{event.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {event.type === "VISIT" && <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-800">เข้าเยี่ยม</span>}
                    {event.type === "NURSE_SHIFT" && <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-sky-200 text-sky-800">เวรผู้ดูแล</span>}
                    {event.type === "MEDICAL_APPOINTMENT" && <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-rose-200 text-rose-800">นัดแพทย์</span>}
                    
                    {event.assignee && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        👤 {event.assignee.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
        ) : (
          openRequests.length === 0 && !loading && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-center text-muted-foreground [&>span]:hidden">
              <span className="text-3xl block mb-2">📭</span>
              <p className="text-sm">ไม่มีกิจกรรมในวันนี้</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
