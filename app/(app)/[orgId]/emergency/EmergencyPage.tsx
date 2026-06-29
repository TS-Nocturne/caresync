"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MedicalDisclaimer from "@/app/components/ui/MedicalDisclaimer";
import SlideToEmergency from "../(family)/family/SlideToEmergency";
import EmergencyScreen from "../(family)/family/EmergencyScreen";

interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  roomNumber: string | null;
}

interface OverviewData {
  patient: PatientInfo | null;
  status: "ok" | "warning" | "critical";
  statusMessage: string;
  vitals: {
    systolic: number | null;
    diastolic: number | null;
    temperature: number | null;
    heartRate: number | null;
    oxygenSat: number | null;
    measuredAt: string;
  } | null;
  caregiver: { name: string } | null;
  medications: { given: number; total: number };
}

interface EmergencyContact {
  name: string;
  phone: string;
  relation: string | null;
}

interface PanicResponse {
  alertId: string;
  patientId: string;
  patientName: string;
  emergencyPhone: string;
  message: string;
  emergencyContacts?: EmergencyContact[];
}

const statusConfig = {
  ok: {
    label: "สถานะปกติ",
    emoji: "💚",
    gradient: "from-emerald-500 to-teal-500",
    textColor: "text-emerald-100",
  },
  warning: {
    label: "มีข้อมูลที่ควรติดตาม",
    emoji: "💛",
    gradient: "from-amber-500 to-orange-500",
    textColor: "text-amber-100",
  },
  critical: {
    label: "ต้องตรวจสอบด่วน — รอผู้ดูแลยืนยันสถานการณ์",
    emoji: "❤️‍🔥",
    gradient: "from-red-500 to-rose-600",
    textColor: "text-rose-100",
  },
};

export default function EmergencyPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicData, setPanicData] = useState<PanicResponse | null>(null);
  const [showEmergencyScreen, setShowEmergencyScreen] = useState(false);
  const [panicTriggeredAt, setPanicTriggeredAt] = useState("");

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
    const timeout = window.setTimeout(() => {
      void loadOverview();
    }, 0);
    const interval = setInterval(loadOverview, 10000);

    return () => {
      window.clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [loadOverview]);

  const patientName = overview?.patient
    ? `${overview.patient.firstName} ${overview.patient.lastName}`
    : "ผู้สูงอายุ";

  const status = overview?.status ?? "ok";
  const config = statusConfig[status];

  const aiInsight =
    overview?.status === "critical" || overview?.status === "warning"
      ? overview.statusMessage
      : overview?.vitals
        ? `${patientName} อยู่ในสถานะปกติ — ยาที่ให้แล้ว ${overview.medications.given}/${overview.medications.total} รายการ`
        : `ยังไม่มีค่าสถิติร่างกายล่าสุดของ ${patientName} ในระบบ`;

  const triggerPanic = async () => {
    if (!overview?.patient || panicLoading) return;
    setPanicLoading(true);
    setError("");

    try {
      const res = await fetch("/api/family/panic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, patientId: overview.patient.id }),
      });
      const json = (await res.json()) as PanicResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || "ไม่สามารถส่งข้อความขอความช่วยเหลือได้");

      setPanicData(json);
      setPanicTriggeredAt(new Date().toISOString());
      setShowEmergencyScreen(true);
      void loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถส่งข้อความขอความช่วยเหลือได้");
    } finally {
      setPanicLoading(false);
    }
  };

  // Full-screen emergency overlay after activation
  if (showEmergencyScreen && panicData) {
    return (
      <EmergencyScreen
        patientName={panicData.patientName}
        message={panicData.message}
        emergencyPhone={panicData.emergencyPhone}
        emergencyContacts={panicData.emergencyContacts}
        triggeredAt={panicTriggeredAt}
        onDismiss={() => setShowEmergencyScreen(false)}
      />
    );
  }

  return (
    <div className="emergency-dedicated-page">
      <div className="emergency-dedicated-page__inner">
        {/* Back link */}
        <Link
          href={`/${orgId}/family`}
          className="emergency-dedicated-page__back"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          กลับหน้าศูนย์บัญชาการ
        </Link>

        {/* Page header */}
        <div className="emergency-dedicated-page__header">
          <div className="emergency-dedicated-page__icon-ring">
            <span className="text-4xl">🚨</span>
          </div>
          <h1 className="emergency-dedicated-page__title">ติดต่อด่วน</h1>
          <p className="emergency-dedicated-page__subtitle">
            ดูแล{patientName}
            {overview?.patient?.roomNumber ? ` — ห้อง ${overview.patient.roomNumber}` : ""}
          </p>
        </div>

        {error && (
          <div className="emergency-dedicated-page__error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="emergency-dedicated-page__loading">
            <div className="mx-auto h-8 w-8 rounded-full border-2 border-rose-300 border-t-transparent animate-spin" />
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <>
            {/* Status banner (compact AI insight) */}
            <div className={`emergency-dedicated-page__status bg-gradient-to-r ${config.gradient}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{config.emoji}</span>
                <div>
                  <p className="font-bold text-white text-sm">{config.label}</p>
                  <p className={`text-xs ${config.textColor} mt-0.5`}>{aiInsight}</p>
                </div>
              </div>
              {overview?.caregiver && (
                <p className={`text-xs ${config.textColor} mt-2`}>
                  👨‍💼 ผู้ดูแล {overview.caregiver.name}
                </p>
              )}
            </div>

            {/* Main slider area */}
            <div className="mb-4">
              <MedicalDisclaimer compact />
            </div>
            <div className="emergency-dedicated-page__slider-area">
              <SlideToEmergency
                onActivate={triggerPanic}
                disabled={!overview?.patient}
                loading={panicLoading}
              />
            </div>

            {/* Info footer */}
            <div className="emergency-dedicated-page__info">
              <div className="emergency-dedicated-page__info-item">
                <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span>ระบบจะส่งข้อความขอความช่วยเหลือให้สมาชิกครอบครัวทุกคน</span>
              </div>
              <div className="emergency-dedicated-page__info-item">
                <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                <span>หลังส่งข้อความ จะแสดงปุ่มโทร 1669 ให้ผู้ใช้เลือกโทรเอง</span>
              </div>
              <div className="emergency-dedicated-page__info-item">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                <span>ปลอดภัยจากการกดผิด — ต้องไสด์ปุ่มจนสุดจึงจะส่งสัญญาณ</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
