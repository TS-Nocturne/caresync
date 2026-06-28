"use client";

import { useState } from "react";
import StatusBadge from "@/app/components/ui/StatusBadge";
import MetricCard from "@/app/components/ui/MetricCard";
import type { FamilyOverviewData } from "./FamilyDashboard";

export default function CurrentStatus({
  overview,
  formatMeasuredAt,
  orgId,
  onResolved,
}: {
  overview: FamilyOverviewData | null;
  formatMeasuredAt: (iso: string) => string;
  orgId: string;
  onResolved: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resolveReason, setResolveReason] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState("");

  const status = overview?.status ?? "ok";
  const activeAlertId = overview?.activeAlertId;
  const canManageAlerts = overview?.canManageAlerts ?? false;

  const statusLabel = {
    ok: "สถานะปกติ",
    warning: "มีข้อมูลที่ควรติดตาม",
    critical: "ต้องตรวจสอบด่วน — รอผู้ดูแลยืนยันสถานการณ์",
  };
  const statusBg = {
    ok: "from-emerald-500 to-teal-500",
    warning: "from-amber-500 to-orange-500",
    critical: "from-red-500 to-rose-600",
  };

  const vitals = overview?.vitals;
  const measuredLabel = vitals?.measuredAt
    ? `วัดล่าสุด ${formatMeasuredAt(vitals.measuredAt)}`
    : "ยังไม่มีการวัด";

  const bpValue =
    vitals?.systolic != null && vitals?.diastolic != null
      ? `${Math.round(vitals.systolic)}/${Math.round(vitals.diastolic)}`
      : "—";

  const handleResolve = async () => {
    if (!resolveReason) {
      setError("กรุณาเลือกเหตุผลในการปิดเคส");
      return;
    }
    
    setIsResolving(true);
    setError("");
    try {
      const res = await fetch("/api/family/resolve-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, alertId: activeAlertId, reason: resolveReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการปิดเคส");
      setIsModalOpen(false);
      setResolveReason("");
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการปิดเคส");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Sticky Banner area */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${statusBg[status]} p-6 text-white shadow-lg`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/20" />
          <div className="absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-white/10" />
        </div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">
                {status === "ok" ? "💚" : status === "warning" ? "💛" : "❤️‍🔥"}
              </span>
              <h2 className="text-2xl font-bold">{statusLabel[status]}</h2>
            </div>
            <p className="text-white/80 text-sm">
              {overview?.statusMessage ?? "กำลังโหลดข้อมูลสถานะ..."}
            </p>

            {/* Resolve UI block inside Critical Banner */}
            {activeAlertId && status === "critical" && (
              <div className="mt-4 pt-4 border-t border-white/20">
                {canManageAlerts ? (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-full bg-white text-rose-600 px-6 py-2.5 text-sm font-bold shadow-sm hover:bg-rose-50 transition-colors"
                  >
                    บันทึกผลการตรวจสอบ / ปิดรายการแจ้งเตือน
                  </button>
                ) : (
                  <div className="bg-black/10 rounded-lg p-3 text-sm text-white/90">
                    <p className="flex items-start gap-2">
                      <span className="text-lg leading-none">🚨</span>
                      <span>
                        ระบบได้แจ้งเตือนไปยังผู้ดูแลหลักแล้ว — กำลังรอพยาบาลหน้างานหรือผู้จัดการครอบครัวอัปเดตสถานะและปิดเคส
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="shrink-0 self-start md:self-center">
            <StatusBadge status={status} size="lg" pulse={status !== "ok"} />
          </div>
        </div>
      </div>

      {/* Quick Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border p-6 animate-slide-up relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-xl font-bold text-foreground mb-1">ปิดรายการแจ้งเตือน</h3>
            <p className="text-sm text-muted-foreground mb-6">กรุณาระบุผลการตรวจสอบของผู้ดูแลเพื่อบันทึกลงระบบ</p>
            
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3 mb-6">
              {[
                "ผู้ดูแลตรวจสอบแล้ว ไม่มีเหตุที่ต้องดำเนินการต่อ",
                "ส่งต่อให้บุคลากรทางการแพทย์หรือบริการฉุกเฉินเป็นผู้ประเมินแล้ว",
                "เป็นการกดทดสอบ / กดผิดพลาด",
              ].map((reason) => (
                <label 
                  key={reason} 
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    resolveReason === reason 
                      ? "border-primary bg-primary/5 ring-1 ring-primary" 
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolveReason"
                    value={reason}
                    checked={resolveReason === reason}
                    onChange={(e) => setResolveReason(e.target.value)}
                    className="mt-1 sr-only"
                  />
                  <div className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                    resolveReason === reason ? "border-primary bg-primary" : "border-input"
                  }`}>
                    {resolveReason === reason && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm font-medium text-foreground">{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                disabled={isResolving}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolveReason || isResolving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {isResolving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึกผลการตรวจสอบ"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="ความดัน"
          value={bpValue}
          unit="mmHg"
          status={vitals?.bloodPressureStatus ?? "ok"}
          subtitle={measuredLabel}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          }
        />
        <MetricCard
          label="อุณหภูมิ"
          value={vitals?.temperature != null ? vitals.temperature.toFixed(1) : "—"}
          unit="°C"
          status={vitals?.temperatureStatus ?? "ok"}
          subtitle={measuredLabel}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
            </svg>
          }
        />
        <MetricCard
          label="ชีพจร"
          value={vitals?.heartRate != null ? Math.round(vitals.heartRate) : "—"}
          unit="bpm"
          status={vitals?.heartRateStatus ?? "ok"}
          subtitle={measuredLabel}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5h2.382a1.5 1.5 0 0 0 1.342-.83l1.526-3.051a.75.75 0 0 1 1.414.164l2.172 6.517a.75.75 0 0 0 1.393.1l1.83-4.574a1.5 1.5 0 0 1 1.393-.943H21" />
            </svg>
          }
        />
        <MetricCard
          label="ออกซิเจน"
          value={vitals?.oxygenSat != null ? Math.round(vitals.oxygenSat) : "—"}
          unit="%"
          status={vitals?.oxygenStatus ?? "ok"}
          subtitle={measuredLabel}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          }
        />
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-xl">
          🩺
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">
            {overview?.caregiver?.name ? `พยาบาล ${overview.caregiver.name}` : "ยังไม่มีผู้ดูแลประจำ"}
          </p>
          <p className="text-xs text-muted-foreground">
            {vitals?.measuredAt
              ? `บันทึกล่าสุด ${formatMeasuredAt(vitals.measuredAt)} น.`
              : "รอการบันทึกจากทีมดูแล"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">ยาที่ให้แล้ว</p>
          <p className="font-bold text-primary">
            {overview?.medications.given ?? 0}/{overview?.medications.total ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}
