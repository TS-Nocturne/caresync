"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import StatusBadge from "@/app/components/ui/StatusBadge";
import CheckInOut from "./CheckInOut";
import VitalSignsForm, { type VitalData } from "./VitalSignsForm";
import PainBodyMap from "./PainBodyMap";
import MedicationChecklist from "./MedicationChecklist";
import AbnormalSymptoms from "./AbnormalSymptoms";
import VitalConfirmDialog from "./VitalConfirmDialog";
import {
  validateVitals,
  validationNeedsConfirmation,
  type ValidationIssue,
} from "@/lib/vital-validation";

interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  roomNumber: string | null;
  allergies: string[];
  baselineSystolic: number | null;
  baselineDiastolic: number | null;
  baselineTemperature: number | null;
  baselineHeartRate: number | null;
  baselineOxygenSat: number | null;
  aiEnabled?: boolean;
}

interface MedItem {
  id: string;
  status: "PENDING" | "GIVEN" | "SKIPPED";
}

function vitalsFromPatient(p: PatientSummary): VitalData {
  return {
    systolic: p.baselineSystolic ?? 120,
    diastolic: p.baselineDiastolic ?? 80,
    temperature: p.baselineTemperature ?? 36.5,
    heartRate: p.baselineHeartRate ?? 72,
    oxygenSat: p.baselineOxygenSat ?? 98,
  };
}

export default function CaregiverDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const { data: session } = useSession();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [vitals, setVitals] = useState<VitalData>({
    systolic: 120,
    diastolic: 80,
    temperature: 36.5,
    heartRate: 72,
    oxygenSat: 98,
  });
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomNotes, setSymptomNotes] = useState("");
  const [symptomReviewed, setSymptomReviewed] = useState(false);
  const [medications, setMedications] = useState<MedItem[]>([]);
  const [brainMessage, setBrainMessage] = useState("");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValidationConfirmed, setPendingValidationConfirmed] = useState(false);

  useEffect(() => {
    async function loadPatient() {
      try {
        const res = await fetch(`/api/patients?orgId=${orgId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load patient");
        const first = json.data?.[0] as PatientSummary | undefined;
        if (first) {
          setPatient(first);
          setVitals(vitalsFromPatient(first));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "โหลดข้อมูลผู้ป่วยไม่สำเร็จ");
      }
    }
    loadPatient();
  }, [orgId]);

  const pendingMedCount = medications.filter((m) => m.status === "PENDING").length;

  const buildVitalsPayload = () => ({
    systolic: vitals.systolic,
    diastolic: vitals.diastolic,
    temperature_c: vitals.temperature,
    heart_rate: vitals.heartRate,
    spo2: vitals.oxygenSat,
  });

  const runSave = async (validationConfirmed: boolean) => {
    if (!patient) {
      setError("ไม่พบข้อมูลผู้ป่วย กรุณาลงทะเบียนผู้ป่วยก่อนใช้งาน");
      return;
    }

    if (!symptomReviewed) {
      setError("กรุณาติ๊กยืนยันการตรวจอาการเบื้องต้นก่อนบันทึก");
      return;
    }

    if (pendingMedCount > 0) {
      setError(`ยังมีรายการยาที่รอให้ ${pendingMedCount} รายการ — กรุณาให้ยาหรือข้ามก่อนจบงาน`);
      return;
    }

    if (patient.aiEnabled !== false) {
      const clientIssues = validateVitals(buildVitalsPayload());
      if (!validationConfirmed && validationNeedsConfirmation(clientIssues)) {
        setValidationIssues(clientIssues);
        setShowConfirmDialog(true);
        return;
      }
    }

    setSaving(true);
    setError("");
    setBrainMessage("");
    setShowConfirmDialog(false);

    try {
      const res = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          patientId: patient.id,
          ...vitals,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ");

      if (patient.aiEnabled !== false) {
        try {
          const brainRes = await fetch("/api/brain/assess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId,
              patientId: patient.id,
              symptoms: selectedSymptoms,
              notes: symptomNotes,
              vitals: buildVitalsPayload(),
              validation_confirmed: validationConfirmed,
            }),
          });
          const brainJson = await brainRes.json();
          if (!brainRes.ok) throw new Error(brainJson.error || "AI brain assessment failed");

          if (brainJson.status === "needs_confirmation") {
            setValidationIssues(brainJson.validation_issues ?? brainJson.state?.validation_issues ?? []);
            setShowConfirmDialog(true);
            setPendingValidationConfirmed(true);
            return;
          }

          if (brainJson.status === "waiting_for_human") {
            router.push(`/${orgId}/family`);
            return;
          }

          setBrainMessage(brainJson.state?.ai_analysis ?? "ประมวลผลข้อมูลเฝ้าระวังเบื้องต้นแล้ว");
        } catch (err) {
          console.error("AI Assessment error:", err);
          setError("บันทึกข้อมูลสำเร็จ แต่ระบบประมวลผลข้อมูลเฝ้าระวัง AI ไม่สามารถให้บริการได้ในขณะนี้");
        }
      } else {
        setBrainMessage("");
      }

      setSaved(true);
      setSelectedSymptoms([]);
      setSymptomNotes("");
      setSymptomReviewed(false);
      setPendingValidationConfirmed(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => runSave(pendingValidationConfirmed);

  const handleConfirmAbnormal = () => {
    setPendingValidationConfirmed(true);
    runSave(true);
  };

  const applySuggestion = (field: string, value: number) => {
    setVitals((current) => {
      if (field === "systolic") return { ...current, systolic: value };
      if (field === "diastolic") return { ...current, diastolic: value };
      if (field === "temperature_c") return { ...current, temperature: value };
      return current;
    });
    setShowConfirmDialog(false);
    setValidationIssues([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {showConfirmDialog && validationIssues.length > 0 && (
        <VitalConfirmDialog
          issues={validationIssues}
          onConfirm={handleConfirmAbnormal}
          onCancel={() => {
            setShowConfirmDialog(false);
            setPendingValidationConfirmed(false);
          }}
          onApplySuggestion={applySuggestion}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">บันทึกข้อมูลผู้สูงอายุ</h1>
            <StatusBadge 
              status={patient?.aiEnabled === false ? "disabled" : "ok"} 
              label={patient?.aiEnabled === false ? "AI Disabled" : undefined} 
            />
          </div>
          <p className="text-muted-foreground text-sm">
            {patient
              ? `${patient.firstName} ${patient.lastName}${patient.nickname ? ` (${patient.nickname})` : ""} — ห้อง ${patient.roomNumber ?? "—"}`
              : "กำลังโหลดข้อมูลผู้ป่วย..."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.5-1.632Z" />
            </svg>
          </span>
          พยาบาล: {session?.user?.name ?? "—"}
        </div>
      </div>

      {patient && patient.allergies.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-700 border-2 border-rose-200 text-sm font-medium">
          ⚠️ แพ้: {patient.allergies.join(", ")} — ตรวจสอบก่อนจ่ายยา
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-sm">
          {error}
        </div>
      )}

      {brainMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-sm">
          {brainMessage}
        </div>
      )}

      {pendingMedCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-sm">
          ระบบจะไม่ยอมให้จบงานจนกว่าจะดำเนินการยาครบ — เหลืออีก {pendingMedCount} รายการ
        </div>
      )}

      <CheckInOut />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <VitalSignsForm vitals={vitals} onChange={setVitals} />
          <PainBodyMap />
        </div>
        <div className="space-y-6">
          <AbnormalSymptoms
            selected={selectedSymptoms}
            notes={symptomNotes}
            reviewed={symptomReviewed}
            onSelectedChange={setSelectedSymptoms}
            onNotesChange={setSymptomNotes}
            onReviewedChange={setSymptomReviewed}
          />
        </div>
      </div>

      <MedicationChecklist
        orgId={orgId}
        patientId={patient?.id ?? null}
        onMedsChange={setMedications}
      />

      <div className="sticky bottom-4 flex justify-center animate-slide-up">
        <button
          onClick={handleSave}
          data-write-action="true"
          disabled={saving || !patient || !symptomReviewed || pendingMedCount > 0}
          className={`px-8 py-4 rounded-2xl text-lg font-semibold shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
            saved
              ? "bg-status-ok text-white scale-95"
              : "bg-primary text-primary-foreground hover:bg-primary-dark hover:shadow-2xl hover:scale-[1.02]"
          }`}
        >
          {saved ? (
            <span className="flex items-center gap-2 animate-check-bounce">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              บันทึกสำเร็จ
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3m3 3 3-3" />
              </svg>
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลทั้งหมด"}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
