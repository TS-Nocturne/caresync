"use client";

import { useState } from "react";
import type { FamilyOverviewData } from "./FamilyDashboard";
import LineConnectCard from "@/app/components/line/LineConnectCard";

type LogEntry = FamilyOverviewData["activityLogs"][number];

const typeConfig = {
  vital: { icon: "🩺", color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-200" },
  medication: { icon: "💊", color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-200" },
  note: { icon: "📝", color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-200" },
  system: { icon: "⏱️", color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-200" },
  alert: { icon: "🤖", color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-900/30", border: "border-rose-200" },
};

export default function ActivityLog({ logs }: { logs: LogEntry[] }) {
  const [filter, setFilter] = useState<"all" | "vital" | "medication" | "note" | "alert">("all");

  const filteredLogs = filter === "all" ? logs : logs.filter((l) => l.type === filter);

  return (
    <div className="glass-card p-4 sm:p-5 animate-fade-in h-full">
      <div className="flex flex-col gap-2 mb-5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <h2 className="text-lg font-semibold">บันทึกกิจกรรม</h2>
        </div>
        <span className="text-xs text-muted-foreground">{logs.length} รายการ</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filter === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          ทั้งหมด
        </button>
        <button
          type="button"
          onClick={() => setFilter("vital")}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filter === "vital" ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground hover:bg-blue-100 dark:hover:bg-blue-900/30"}`}
        >
          ค่าสถิติร่างกาย
        </button>
        <button
          type="button"
          onClick={() => setFilter("medication")}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filter === "medication" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:bg-emerald-100 dark:hover:bg-emerald-900/30"}`}
        >
          การให้ยา
        </button>
        <button
          type="button"
          onClick={() => setFilter("note")}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filter === "note" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground hover:bg-amber-100 dark:hover:bg-amber-900/30"}`}
        >
          หมายเหตุ
        </button>
        <button
          type="button"
          onClick={() => setFilter("alert")}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filter === "alert" ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground hover:bg-rose-100 dark:hover:bg-rose-900/30"}`}
        >
          แจ้งเตือน
        </button>
      </div>

      {filteredLogs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          ยังไม่มีบันทึก — ข้อมูลจะปรากฏเมื่อทีมดูแลบันทึก
        </p>
      ) : (
        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {filteredLogs.map((log, index) => {
            const config = typeConfig[log.type];
            return (
              <div key={log.id} className="space-y-4">
              <div
                className="relative flex items-start gap-3 md:justify-normal md:gap-0 md:odd:flex-row-reverse group"
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-card shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${config.bg} z-10 transition-transform group-hover:scale-110`}
                >
                  <span className="text-sm">{config.icon}</span>
                </div>

                <div className="w-full p-3 sm:p-4 md:w-[calc(50%-2.5rem)] rounded-xl border border-border bg-card shadow-sm group-hover:shadow-md group-hover:border-primary/30 transition-all">
                  <div className="flex flex-col gap-1 mb-1 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                    <span className={`text-xs font-bold ${config.color}`}>{log.title}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {new Date(log.time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{log.description}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px]">
                      {log.type === "alert" ? "🤖" : "👤"}
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {log.user === "ระบบ" && log.type === "alert" ? "AI Assistant" : log.user}
                    </span>
                  </div>
                </div>
              </div>
              {index === 1 && filter === "all" ? (
                <div className="relative z-10 md:mx-auto md:w-[calc(50%-2.5rem)]">
                  <LineConnectCard
                    mode="compact"
                    hideWhenConnected
                    title="รู้ทันทีเมื่อเกิดเหตุการณ์แบบนี้"
                    description="รับแจ้งเตือนอาการผิดปกติ การให้ยา และเหตุฉุกเฉินผ่าน LINE แบบ Real-time"
                  />
                </div>
              ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
