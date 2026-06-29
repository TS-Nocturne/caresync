"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MedicalDisclaimer from "@/app/components/ui/MedicalDisclaimer";
import CurrentStatus from "./CurrentStatus";
import SharedCalendar from "./SharedCalendar";
import ActivityLog from "./ActivityLog";
import FamilyQuickActions from "./FamilyQuickActions";

export interface FamilyOverviewData {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    roomNumber: string | null;
    baselineSystolic: number | null;
    baselineDiastolic: number | null;
    baselineTemperature: number | null;
    baselineHeartRate: number | null;
    baselineOxygenSat: number | null;
    baselineSystolicLower: number | null;
    baselineSystolicUpper: number | null;
    baselineDiastolicLower: number | null;
    baselineDiastolicUpper: number | null;
    baselineTemperatureLower: number | null;
    baselineTemperatureUpper: number | null;
    baselineHeartRateLower: number | null;
    baselineHeartRateUpper: number | null;
    baselineOxygenSatMin: number | null;
    baselineOxygenSatMax: number | null;
    baselineInsightText?: string | null;
    baselineCalculatedAt?: string | null;
  } | null;
  status: "ok" | "warning" | "critical";
  statusMessage: string;
  vitals: {
    systolic: number | null;
    diastolic: number | null;
    temperature: number | null;
    heartRate: number | null;
    oxygenSat: number | null;
    measuredAt: string;
    recordedByName: string | null;
    recordedByRole: string | null;
    bloodPressureStatus: "ok" | "warning" | "critical";
    temperatureStatus: "ok" | "warning" | "critical";
    heartRateStatus: "ok" | "warning" | "critical";
    oxygenStatus: "ok" | "warning" | "critical";
  } | null;
  caregiver: { name: string } | null;
  medications: { given: number; total: number };
  lastUpdate: string | null;
  activityLogs: Array<{
    id: string;
    time: string;
    type: "vital" | "medication" | "system" | "note" | "alert";
    title: string;
    description: string;
    user: string;
    createdAt: string;
  }>;
  activeAlertId: string | null;
  canManageAlerts: boolean;
}

const POLL_MS = 5000;

function formatRelativeTime(dateStr: string | null) {
  if (!dateStr) return "ยังไม่มีข้อมูล";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม. ที่แล้ว`;
  return `${Math.floor(hrs / 24)} วันที่แล้ว`;
}

function formatMeasuredAt(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  return `${date.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} ${time}`;
}

export default function FamilyDashboard() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [overview, setOverview] = useState<FamilyOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/family/overview?orgId=${orgId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "โหลดข้อมูลไม่สำเร็จ");
      setOverview(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOverview();
    }, 0);
    const interval = setInterval(loadOverview, POLL_MS);
    return () => {
      window.clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [loadOverview]);

  const patientName = overview?.patient
    ? `${overview.patient.firstName} ${overview.patient.lastName}`
    : "ผู้สูงอายุ";

  const aiInsight =
    overview?.patient?.baselineInsightText ??
    (overview?.status === "critical"
      ? overview.statusMessage
      : overview?.status === "warning"
        ? overview.statusMessage
        : overview?.vitals
          ? `สรุปล่าสุด: ${patientName} อยู่ในสถานะปกติจากข้อมูลค่าสถิติร่างกายล่าสุด กิจวัตรที่ทำแล้ว ${overview.medications.given}/${overview.medications.total} รายการ`
          : `สรุปล่าสุด: ยังไม่มีค่าสถิติร่างกายล่าสุดของ ${patientName} ในระบบ`);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
      <div className="animate-fade-in">
        <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-start min-[520px]:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-1">ศูนย์บัญชาการครอบครัว</h1>
            <p className="text-muted-foreground text-sm">
              ดูแล{patientName}
              {overview?.patient?.roomNumber ? ` — ห้อง ${overview.patient.roomNumber}` : ""}
              {" · "}
              อัปเดตล่าสุด {formatRelativeTime(overview?.lastUpdate ?? null)}
            </p>
          </div>
          <div className="flex items-center gap-2 min-[520px]:shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-sm text-rose-600">{error}</p>
        )}
      </div>

      {loading && !overview ? (
        <div className="space-y-6 animate-pulse mt-8">
          <div className="h-32 bg-card rounded-2xl border border-border"></div>
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 h-80 bg-card rounded-2xl border border-border"></div>
            <div className="lg:col-span-2 h-80 bg-card rounded-2xl border border-border"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Care note banner */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm animate-fade-in">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                AI
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">Care Coordination Note</h2>
                <p className="text-xs text-muted-foreground">ข้อมูลที่บันทึกไว้เพื่อให้ผู้ดูแลตรวจสอบร่วมกัน</p>
              </div>
            </div>
            <p className="text-base leading-7 text-foreground">{aiInsight}</p>
            <div className="mt-4">
              <MedicalDisclaimer compact />
            </div>
          </section>

          {/* Urgent contact link card */}
          <Link
            href={`/${orgId}/emergency`}
            className="block rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/20 animate-fade-in transition-all hover:shadow-lg hover:border-rose-400 dark:hover:border-rose-800 group"
            id="emergency-page-link"
          >
            <div className="flex flex-col gap-4 min-[520px]:flex-row min-[520px]:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white text-2xl shadow-lg shadow-rose-600/25 group-hover:scale-105 transition-transform sm:h-14 sm:w-14">
                🚨
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                  ติดต่อด่วน
                </h3>
                <p className="text-sm text-rose-700/70 dark:text-rose-300/70 mt-0.5">
                  ส่งข้อความขอความช่วยเหลือให้ครอบครัว และแสดงเบอร์ 1669 ให้ผู้ใช้เลือกโทรเอง
                </p>
              </div>
              <svg className="hidden w-5 h-5 shrink-0 text-rose-400 group-hover:translate-x-1 transition-transform min-[520px]:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>

          <CurrentStatus 
            overview={overview} 
            formatMeasuredAt={formatMeasuredAt} 
            orgId={orgId}
            onResolved={loadOverview}
          />
          {overview?.patient?.id && (
            <FamilyQuickActions
              key={`${overview.patient.id}:${overview.vitals?.measuredAt ?? overview.patient.baselineCalculatedAt ?? "baseline"}`}
              orgId={orgId}
              patientId={overview.patient.id}
              latestVitals={overview.vitals}
              baseline={overview.patient}
              onSaved={loadOverview}
            />
          )}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SharedCalendar orgId={orgId} />
            </div>
            <div className="lg:col-span-2">
              <ActivityLog logs={overview?.activityLogs ?? []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
