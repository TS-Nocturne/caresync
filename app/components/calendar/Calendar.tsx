"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type UserBasic = { id: string; name: string; image: string | null };

export type EventType = "VISIT" | "MEDICAL_APPOINTMENT" | "NURSE_SHIFT" | "FAMILY_REQUEST" | "OTHER";
export type EventStatus = "OPEN" | "ASSIGNED" | "COMPLETED" | "CANCELLED";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  status: EventStatus;
  startTime: string;
  endTime: string;
  creatorId: string;
  assigneeId: string | null;
  creator: UserBasic;
  assignee: UserBasic | null;
};

export default function Calendar({
  orgId,
  currentUserId,
  portalRole,
  isOwnerOrAdmin,
}: {
  orgId: string;
  currentUserId: string;
  portalRole: "CAREGIVER" | "FAMILY" | null;
  isOwnerOrAdmin: boolean;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EventType>("VISIT");
  const [eventDate, setEventDate] = useState("");
  const [startHour, setStartHour] = useState("09");
  const [startMin, setStartMin] = useState("00");
  const [endHour, setEndHour] = useState("10");
  const [endMin, setEndMin] = useState("00");

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
      const startDateTime = new Date(`${eventDate}T${startHour}:${startMin}:00`);
      const endDateTime = new Date(`${eventDate}T${endHour}:${endMin}:00`);

      const res = await fetch(`/api/calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          title,
          description,
          type,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        setTitle("");
        setDescription("");
        setType("VISIT");
        setEventDate("");
        setStartHour("09");
        setStartMin("00");
        setEndHour("10");
        setEndMin("00");
        fetchEvents();
      } else {
      alert("ไม่สามารถสร้างกิจกรรมได้ โปรดตรวจสอบสิทธิ์");
    }
  };

  const handleClaim = async (eventId: string) => {
    const res = await fetch(`/api/calendar/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action: "claim" }),
    });
    if (res.ok) {
      alert("รับอาสาสำเร็จ!");
      fetchEvents();
    } else {
      const error = await res.json();
      alert(`ไม่สามารถรับอาสาได้: ${error.error}`);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("ต้องการลบกิจกรรมนี้ใช่หรือไม่?")) return;
    const res = await fetch(`/api/calendar/${eventId}?orgId=${orgId}`, {
      method: "DELETE",
    });
    if (res.ok) fetchEvents();
  };

  const canCreateFamilyRequest = isOwnerOrAdmin;

  return (
    <div className="w-full max-w-2xl mx-auto pb-24">
      <div className="flex flex-col gap-3 mb-6 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <h2 className="text-xl font-bold sm:text-2xl">ปฏิทิน & กิจกรรม</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="w-full bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold shadow hover:bg-primary/90 transition min-[420px]:w-auto"
        >
          + เพิ่มกิจกรรม
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          ยังไม่มีกิจกรรมในปฏิทิน
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 dark:before:via-gray-700 before:to-transparent">
          {events.map((ev) => {
            const isFamilyReq = ev.type === "FAMILY_REQUEST";
            const isOpen = ev.status === "OPEN";
            const isAssigned = ev.status === "ASSIGNED";
            
            // Color mapping
            let bgColor = "bg-white dark:bg-gray-800";
            let borderColor = "border-gray-200 dark:border-gray-700";
            let badgeColor = "bg-gray-100 text-gray-800";
            
            if (isFamilyReq && isOpen) {
              borderColor = "border-amber-400";
              bgColor = "bg-amber-50 dark:bg-amber-900/20";
              badgeColor = "bg-amber-500 text-white";
            } else if (ev.type === "VISIT") {
              borderColor = "border-emerald-400";
              badgeColor = "bg-emerald-100 text-emerald-800";
            } else if (ev.type === "MEDICAL_APPOINTMENT") {
              borderColor = "border-rose-400";
              badgeColor = "bg-rose-100 text-rose-800";
            } else if (ev.type === "NURSE_SHIFT") {
              borderColor = "border-sky-400";
              badgeColor = "bg-sky-100 text-sky-800";
            }

            return (
              <div key={ev.id} className="relative flex items-start gap-3 md:items-center md:justify-normal md:gap-0 md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-background bg-slate-200 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${isOpen && isFamilyReq ? "bg-emerald-500 text-white animate-pulse" : ""}`}>
                  {ev.type === "VISIT" && "👋"}
                  {ev.type === "MEDICAL_APPOINTMENT" && "🏥"}
                  {ev.type === "NURSE_SHIFT" && "🩺"}
                  {ev.type === "FAMILY_REQUEST" && "🚗"}
                  {ev.type === "OTHER" && "📌"}
                </div>
                <div className={`w-full md:w-[calc(50%-2.5rem)] p-3 sm:p-4 rounded-xl border shadow-sm transition-all ${bgColor} ${borderColor}`}>
                  <div className="flex flex-col gap-2 mb-2 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${badgeColor}`}>
                      {ev.type === "FAMILY_REQUEST" ? "ขออาสาสมัคร" : ev.type === "NURSE_SHIFT" ? "เวรผู้ดูแล" : ev.type === "VISIT" ? "เข้าเยี่ยม" : ev.type === "MEDICAL_APPOINTMENT" ? "นัดตรวจสุขภาพ" : "อื่นๆ"}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {format(new Date(ev.startTime), "d MMM", { locale: th })} {format(new Date(ev.startTime), "HH:mm")}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{ev.title}</h3>
                  {ev.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{ev.description}</p>}
                  
                  <div className="flex flex-col gap-3 mt-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      {isAssigned && ev.assignee ? (
                        <>
                          {ev.assignee.image ? (
                            <Image
                              src={ev.assignee.image}
                              alt={ev.assignee.name}
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{ev.assignee.name.charAt(0)}</div>
                          )}
                          <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{ev.assignee.name}</span>
                        </>
                      ) : isOpen ? (
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">ยังไม่มีคนรับงาน</span>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {isFamilyReq && isOpen && (portalRole === "FAMILY" || isOwnerOrAdmin) && ev.creatorId !== currentUserId && (
                        <button
                          onClick={() => handleClaim(ev.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-md transition-transform active:scale-95"
                        >
                          รับอาสา
                        </button>
                      )}
                      
                      {(isOwnerOrAdmin || ev.creatorId === currentUserId) && (
                        <button onClick={() => handleDelete(ev.id)} className="text-gray-400 hover:text-red-500 transition">
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">เพิ่มกิจกรรมใหม่</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">หัวข้อกิจกรรม</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full border dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent" placeholder="เช่น พาแม่ไปหาหมอ, นัดกายภาพ" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">ประเภท</label>
                <select value={type} onChange={e => setType(e.target.value as EventType)} className="w-full border dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent">
                  {portalRole === "FAMILY" && <option value="MEDICAL_APPOINTMENT">🏥 นัดแพทย์ / โรงพยาบาล</option>}
                  <option value="VISIT">👋 เข้าเยี่ยม</option>
                  {(isOwnerOrAdmin || portalRole === "CAREGIVER") && <option value="MEDICAL_APPOINTMENT">🏥 นัดตรวจสุขภาพ</option>}
                  {(isOwnerOrAdmin || portalRole === "CAREGIVER") && <option value="NURSE_SHIFT">🩺 ลงเวรผู้ดูแล</option>}
                  {canCreateFamilyRequest && <option value="FAMILY_REQUEST">🚗 ขออาสาสมัคร (Family Request)</option>}
                  <option value="OTHER">📌 อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">วันที่</label>
                <input required value={eventDate} onChange={e => setEventDate(e.target.value)} type="date" className="w-full border dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-sm" />
              </div>

              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">เวลาเริ่ม</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      min="0" max="23" 
                      value={startHour} 
                      onChange={e => setStartHour(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      onBlur={e => {
                        let v = parseInt(e.target.value);
                        if (isNaN(v)) v = 0;
                        setStartHour(Math.min(23, Math.max(0, v)).toString().padStart(2, "0"));
                      }}
                      className="w-16 text-center border dark:border-gray-700 rounded-xl px-2 py-2 bg-transparent text-sm" 
                    />
                    <span className="self-center font-bold">:</span>
                    <select value={startMin} onChange={e => setStartMin(e.target.value)} className="w-20 border dark:border-gray-700 rounded-xl px-2 py-2 bg-transparent text-sm">
                      {["00", "15", "30", "45"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">เวลาสิ้นสุด</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      min="0" max="23" 
                      value={endHour} 
                      onChange={e => setEndHour(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      onBlur={e => {
                        let v = parseInt(e.target.value);
                        if (isNaN(v)) v = 0;
                        setEndHour(Math.min(23, Math.max(0, v)).toString().padStart(2, "0"));
                      }}
                      className="w-16 text-center border dark:border-gray-700 rounded-xl px-2 py-2 bg-transparent text-sm" 
                    />
                    <span className="self-center font-bold">:</span>
                    <select value={endMin} onChange={e => setEndMin(e.target.value)} className="w-20 border dark:border-gray-700 rounded-xl px-2 py-2 bg-transparent text-sm">
                      {["00", "15", "30", "45"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">รายละเอียด (ไม่บังคับ)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent" rows={2} placeholder="รายละเอียดเพิ่มเติม..."></textarea>
              </div>

              <div className="grid gap-3 pt-4 min-[420px]:grid-cols-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 font-medium">ยกเลิก</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-primary text-white font-bold shadow-md">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
