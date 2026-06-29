"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  COMMON_ALLERGIES,
  COMMON_DISEASES,
  MEDICATION_DOSE_UNITS,
  MEDICATION_FREQUENCY_LABELS,
  TIME_OF_DAY_LABELS,
  WEEKDAY_LABELS,
  calculateAge,
  calculateBmi,
  type EmergencyContactInput,
  type InsuranceType,
  type MedicationInput,
  type MobilityStatus,
  type PatientRegistrationInput,
  type TimeOfDay,
} from "@/lib/patient-registration";

const STEPS = [
  { id: 1, title: "ความยินยอม", icon: "📋" },
  { id: 2, title: "ข้อมูลส่วนตัว", icon: "👤" },
  { id: 3, title: "ข้อมูลสุขภาพ", icon: "📋" },
  { id: 4, title: "กิจวัตรประจำวัน", icon: "📅" },
  { id: 5, title: "เหตุฉุกเฉิน", icon: "🚑" },
  { id: 6, title: "ตรวจสอบ", icon: "✓" },
];

const MOBILITY_OPTIONS: { value: MobilityStatus; label: string }[] = [
  { value: "INDEPENDENT", label: "เดินได้ปกติ" },
  { value: "ASSISTED", label: "เดินได้ — ใช้ไม้เท้า" },
  { value: "WHEELCHAIR", label: "นั่งรถเข็น" },
  { value: "BEDBOUND", label: "ติดเตียง" },
];

const INSURANCE_OPTIONS: { value: InsuranceType; label: string }[] = [
  { value: "REIMBURSEMENT", label: "เบิกได้" },
  { value: "SOCIAL_SECURITY", label: "ประกันสังคม" },
  { value: "GOLD_CARD", label: "บัตรทอง" },
  { value: "SELF_PAY", label: "จ่ายเอง" },
];

const emptyMed = (): MedicationInput => ({
  name: "",
  strength: "",
  doseAmount: "",
  doseUnit: "เม็ด",
  dosage: "",
  timeOfDay: ["MORNING"],
  isPrn: false,
  frequency: "DAILY",
  frequencyDays: [],
  indication: "",
  appearance: "",
  instruction: "",
  selfAdministered: false,
});

const emptyContact = (): EmergencyContactInput => ({
  name: "",
  phone: "",
  relation: "",
  isPrimary: false,
});

type DraftFormData = {
  consentRelation: string;
  consentMandatory: boolean;
  consentOptional: boolean;
  firstName: string;
  lastName: string;
  nickname: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  weightKg: string;
  heightCm: string;
  roomNumber: string;
  underlyingDiseases: string[];
  customDisease: string;
  allergies: string[];
  customAllergy: string;
  mobilityStatus: MobilityStatus;
  baselineSystolic: string;
  baselineDiastolic: string;
  baselineTemperature: string;
  baselineHeartRate: string;
  baselineOxygenSat: string;
  medications: MedicationInput[];
  preferredHospital: string;
  hospitalNumber: string;
  insuranceType: InsuranceType;
  emergencyContacts: EmergencyContactInput[];
};

type DraftResponse = {
  error?: string;
  data?: {
    currentStep: number;
    data: Partial<DraftFormData>;
    updatedAt: string;
  } | null;
};

const stringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const booleanValue = (value: unknown) => value === true;

const stringListValue = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const hasDraftContent = (data: DraftFormData) =>
  Boolean(
    data.consentRelation ||
      data.consentMandatory ||
      data.consentOptional ||
      data.firstName ||
      data.lastName ||
      data.nickname ||
      data.dateOfBirth ||
      data.bloodType ||
      data.weightKg ||
      data.heightCm ||
      data.roomNumber ||
      data.underlyingDiseases.length ||
      data.customDisease ||
      data.allergies.length ||
      data.customAllergy ||
      data.baselineSystolic ||
      data.baselineDiastolic ||
      data.baselineTemperature ||
      data.baselineHeartRate ||
      data.baselineOxygenSat ||
      data.medications.some((m) => m.name || m.strength || m.doseAmount || m.dosage || m.instruction) ||
      data.preferredHospital ||
      data.hospitalNumber ||
      data.insuranceType !== "SOCIAL_SECURITY" ||
      data.emergencyContacts.some((c) => c.name || c.phone || c.relation)
  );

interface PatientRegistrationWizardProps {
  mode?: "create" | "edit";
  patientId?: string;
}

export default function PatientRegistrationWizard({ mode = "create", patientId }: PatientRegistrationWizardProps) {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const isEditMode = mode === "edit";

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [consentRelation, setConsentRelation] = useState("");
  const [consentMandatory, setConsentMandatory] = useState(false);
  const [consentOptional, setConsentOptional] = useState(false);
  const [showAiWarning, setShowAiWarning] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState("");
  const submittingRef = useRef(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("female");
  const [bloodType, setBloodType] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [roomNumber, setRoomNumber] = useState("");

  const [underlyingDiseases, setUnderlyingDiseases] = useState<string[]>([]);
  const [customDisease, setCustomDisease] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [mobilityStatus, setMobilityStatus] = useState<MobilityStatus>("INDEPENDENT");
  const [baselineSystolic, setBaselineSystolic] = useState("");
  const [baselineDiastolic, setBaselineDiastolic] = useState("");
  const [baselineTemperature, setBaselineTemperature] = useState("");
  const [baselineHeartRate, setBaselineHeartRate] = useState("");
  const [baselineOxygenSat, setBaselineOxygenSat] = useState("");

  const [medications, setMedications] = useState<MedicationInput[]>([emptyMed()]);

  const [preferredHospital, setPreferredHospital] = useState("");
  const [hospitalNumber, setHospitalNumber] = useState("");
  const [insuranceType, setInsuranceType] = useState<InsuranceType>("SOCIAL_SECURITY");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactInput[]>([
    { ...emptyContact(), isPrimary: true },
  ]);

  const age = dateOfBirth ? calculateAge(dateOfBirth) : null;
  const bmi = calculateBmi(weightKg ? Number(weightKg) : undefined, heightCm ? Number(heightCm) : undefined);

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const resetForm = useCallback(() => {
    setStep(1);
    setError("");
    setConsentRelation("");
    setConsentMandatory(false);
    setConsentOptional(false);
    setFirstName("");
    setLastName("");
    setNickname("");
    setDateOfBirth("");
    setGender("female");
    setBloodType("");
    setWeightKg("");
    setHeightCm("");
    setRoomNumber("");
    setUnderlyingDiseases([]);
    setCustomDisease("");
    setAllergies([]);
    setCustomAllergy("");
    setMobilityStatus("INDEPENDENT");
    setBaselineSystolic("");
    setBaselineDiastolic("");
    setBaselineTemperature("");
    setBaselineHeartRate("");
    setBaselineOxygenSat("");
    setMedications([emptyMed()]);
    setPreferredHospital("");
    setHospitalNumber("");
    setInsuranceType("SOCIAL_SECURITY");
    setEmergencyContacts([{ ...emptyContact(), isPrimary: true }]);
  }, []);

  const applyDraft = useCallback((data: Partial<DraftFormData>, currentStep: number) => {
    setConsentRelation(stringValue(data.consentRelation));
    setConsentMandatory(booleanValue(data.consentMandatory));
    setConsentOptional(booleanValue(data.consentOptional));
    setFirstName(stringValue(data.firstName));
    setLastName(stringValue(data.lastName));
    setNickname(stringValue(data.nickname));
    setDateOfBirth(stringValue(data.dateOfBirth));
    setGender(stringValue(data.gender, "female"));
    setBloodType(stringValue(data.bloodType));
    setWeightKg(stringValue(data.weightKg));
    setHeightCm(stringValue(data.heightCm));
    setRoomNumber(stringValue(data.roomNumber));
    setUnderlyingDiseases(stringListValue(data.underlyingDiseases));
    setCustomDisease(stringValue(data.customDisease));
    setAllergies(stringListValue(data.allergies));
    setCustomAllergy(stringValue(data.customAllergy));
    setMobilityStatus((data.mobilityStatus ?? "INDEPENDENT") as MobilityStatus);
    setBaselineSystolic(stringValue(data.baselineSystolic));
    setBaselineDiastolic(stringValue(data.baselineDiastolic));
    setBaselineTemperature(stringValue(data.baselineTemperature));
    setBaselineHeartRate(stringValue(data.baselineHeartRate));
    setBaselineOxygenSat(stringValue(data.baselineOxygenSat));
    setMedications(
      Array.isArray(data.medications) && data.medications.length
        ? data.medications.map((med) => ({
            ...emptyMed(),
            ...med,
            strength: med.strength ?? "",
            doseAmount: med.doseAmount != null ? String(med.doseAmount) : "",
            doseUnit: med.doseUnit || "เม็ด",
            frequency: med.frequency ?? "DAILY",
            frequencyDays: med.frequencyDays ?? [],
          }))
        : [emptyMed()]
    );
    setPreferredHospital(stringValue(data.preferredHospital));
    setHospitalNumber(stringValue(data.hospitalNumber));
    setInsuranceType((data.insuranceType ?? "SOCIAL_SECURITY") as InsuranceType);
    setEmergencyContacts(
      Array.isArray(data.emergencyContacts) && data.emergencyContacts.length
        ? data.emergencyContacts
        : [{ ...emptyContact(), isPrimary: true }]
    );
    setStep(Math.min(Math.max(currentStep, 1), STEPS.length));
  }, []);

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!consentRelation) return "กรุณาระบุความสัมพันธ์กับผู้สูงอายุ";
      if (!consentMandatory) return "คุณต้องยินยอมเงื่อนไขพื้นฐานก่อนดำเนินการต่อ";
    }
    if (s === 2) {
      if (!firstName.trim() || !lastName.trim()) return "กรุณากรอกชื่อ-นามสกุล";
      if (!dateOfBirth) return "กรุณาเลือกวันเกิด";
    }
    if (s === 4) {
      const incompleteMedication = medications.find(
        (med) =>
          (med.name.trim() || med.strength.trim() || String(med.doseAmount).trim() || med.dosage.trim()) &&
          (
            !med.name.trim() ||
            !med.strength.trim() ||
            !String(med.doseAmount).trim() ||
            Number(med.doseAmount) <= 0 ||
            !med.doseUnit.trim()
          )
      );
      if (incompleteMedication) {
        return "กรุณากรอกชื่อรายการ ขนาด จำนวน และหน่วยให้ครบทุกช่อง";
      }
      const customWithoutDays = medications.find(
        (med) =>
          !med.isPrn &&
          med.frequency === "CUSTOM_DAYS" &&
          med.name.trim() &&
          med.frequencyDays.length === 0
      );
      if (customWithoutDays) {
        return "กรุณาเลือกวันที่ต้องทำรายการอย่างน้อย 1 วัน";
      }
    }
    if (s === 5) {
      const primary = emergencyContacts.filter((c) => c.name.trim() && c.phone.trim());
      if (primary.length === 0) return "กรุณากรอกเบอร์ติดต่อฉุกเฉินอย่างน้อย 1 รายการ";
    }
    return null;
  };

  const payload = useMemo((): PatientRegistrationInput => ({
    orgId,
    consentRelation,
    consentMandatory,
    consentOptional,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    nickname: nickname.trim() || undefined,
    dateOfBirth,
    gender,
    bloodType: bloodType || undefined,
    weightKg: weightKg ? Number(weightKg) : undefined,
    heightCm: heightCm ? Number(heightCm) : undefined,
    roomNumber: roomNumber.trim() || undefined,
    underlyingDiseases,
    allergies,
    mobilityStatus,
    baselineSystolic: baselineSystolic ? Number(baselineSystolic) : undefined,
    baselineDiastolic: baselineDiastolic ? Number(baselineDiastolic) : undefined,
    baselineTemperature: baselineTemperature ? Number(baselineTemperature) : undefined,
    baselineHeartRate: baselineHeartRate ? Number(baselineHeartRate) : undefined,
    baselineOxygenSat: baselineOxygenSat ? Number(baselineOxygenSat) : undefined,
    preferredHospital: preferredHospital.trim() || undefined,
    hospitalNumber: hospitalNumber.trim() || undefined,
    insuranceType,
    emergencyContacts: emergencyContacts.filter((c) => c.name.trim() && c.phone.trim()),
    medications: medications
      .filter((m) => m.name.trim() && m.strength.trim() && String(m.doseAmount).trim() && m.doseUnit.trim())
      .map((m) => ({ ...m, dosage: `${m.doseAmount} ${m.doseUnit}` })),
  }), [
    orgId, firstName, lastName, nickname, dateOfBirth, gender, bloodType,
    weightKg, heightCm, roomNumber, underlyingDiseases, allergies, mobilityStatus,
    baselineSystolic, baselineDiastolic, baselineTemperature, baselineHeartRate,
    baselineOxygenSat, preferredHospital, hospitalNumber, insuranceType,
    emergencyContacts, medications, consentRelation, consentMandatory, consentOptional
  ]);

  const draftData = useMemo((): DraftFormData => ({
    consentRelation,
    consentMandatory,
    consentOptional,
    firstName,
    lastName,
    nickname,
    dateOfBirth,
    gender,
    bloodType,
    weightKg,
    heightCm,
    roomNumber,
    underlyingDiseases,
    customDisease,
    allergies,
    customAllergy,
    mobilityStatus,
    baselineSystolic,
    baselineDiastolic,
    baselineTemperature,
    baselineHeartRate,
    baselineOxygenSat,
    medications,
    preferredHospital,
    hospitalNumber,
    insuranceType,
    emergencyContacts,
  }), [
    consentRelation, consentMandatory, consentOptional, firstName, lastName, nickname,
    dateOfBirth, gender, bloodType, weightKg, heightCm, roomNumber, underlyingDiseases,
    customDisease, allergies, customAllergy, mobilityStatus, baselineSystolic,
    baselineDiastolic, baselineTemperature, baselineHeartRate, baselineOxygenSat,
    medications, preferredHospital, hospitalNumber, insuranceType, emergencyContacts
  ]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    let cancelled = false;

    async function loadDraft() {
      try {
        const res = await fetch(`/api/patient-registration-draft?orgId=${orgId}`);
        const json = (await res.json()) as DraftResponse;
        if (!res.ok) throw new Error(json && "error" in json ? String(json.error) : "โหลดแบบร่างไม่สำเร็จ");

        if (!cancelled && json.data) {
          applyDraft(json.data.data, json.data.currentStep);
          setDraftSavedAt(json.data.updatedAt);
          setDraftNotice("โหลดข้อมูลที่กรอกค้างไว้แล้ว");
        }
      } catch (err) {
        if (!cancelled) {
          setDraftNotice(err instanceof Error ? err.message : "โหลดแบบร่างไม่สำเร็จ");
        }
      } finally {
        if (!cancelled) setDraftReady(true);
      }
    }

    loadDraft();

    return () => {
      cancelled = true;
    };
  }, [applyDraft, isEditMode, orgId]);

  useEffect(() => {
    if (!isEditMode || !patientId) return;

    let cancelled = false;

    async function loadPatientForEdit() {
      try {
        const res = await fetch(`/api/patients/${patientId}?orgId=${orgId}`);
        const json = (await res.json()) as DraftResponse;
        if (!res.ok) throw new Error(json.error || "โหลดข้อมูลผู้สูงอายุไม่สำเร็จ");
        if (json.data && !cancelled) {
          applyDraft(json.data.data, json.data.currentStep);
          setDraftNotice("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "โหลดข้อมูลผู้สูงอายุไม่สำเร็จ");
        }
      } finally {
        if (!cancelled) setDraftReady(true);
      }
    }

    loadPatientForEdit();

    return () => {
      cancelled = true;
    };
  }, [applyDraft, isEditMode, orgId, patientId]);

  useEffect(() => {
    if (isEditMode || !draftReady || submittingRef.current || !hasDraftContent(draftData)) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/patient-registration-draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId, currentStep: step, data: draftData }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("บันทึกแบบร่างไม่สำเร็จ");
        setDraftSavedAt(new Date().toISOString());
        setDraftNotice("");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setDraftNotice(err instanceof Error ? err.message : "บันทึกแบบร่างไม่สำเร็จ");
      }
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [draftData, draftReady, isEditMode, orgId, step]);

  const clearDraft = useCallback(async () => {
    submittingRef.current = true;
    setDraftNotice("");
    try {
      await fetch(`/api/patient-registration-draft?orgId=${orgId}`, { method: "DELETE" });
      resetForm();
      setDraftSavedAt(null);
      setDraftNotice("ล้างแบบร่างแล้ว");
    } catch {
      setDraftNotice("ล้างแบบร่างไม่สำเร็จ");
    } finally {
      submittingRef.current = false;
    }
  }, [orgId, resetForm]);

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const submitData = async (overrideConsentOptional: boolean | null = null) => {
    submittingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const finalPayload = { ...payload };
      if (overrideConsentOptional !== null) {
        finalPayload.consentOptional = overrideConsentOptional;
      }

      const res = await fetch(isEditMode && patientId ? `/api/patients/${patientId}` : "/api/patients", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || (isEditMode ? "แก้ไขข้อมูลไม่สำเร็จ" : "ลงทะเบียนไม่สำเร็จ"));
      if (!isEditMode) {
        await fetch(`/api/patient-registration-draft?orgId=${orgId}`, { method: "DELETE" }).catch(() => null);
      }
      router.push(`/${orgId}/dashboard?${isEditMode ? "updated=1" : "registered=1"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEditMode ? "แก้ไขข้อมูลไม่สำเร็จ" : "ลงทะเบียนไม่สำเร็จ"));
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const handleInitialSubmit = () => {
    if (isEditMode) {
      submitData();
      return;
    }
    if (!consentOptional) {
      setShowAiWarning(true);
      return;
    }
    submitData();
  };

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <>
      {showAiWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold flex items-center gap-2 text-rose-600">
              <span>⚠️</span> แจ้งเตือนการปิดระบบ AI
            </h3>
            <div className="space-y-4 text-sm text-foreground/90">
              <p>
                คุณเลือกที่จะ <strong className="text-rose-600">ไม่เปิดใช้งาน</strong> ระบบ AI สำหรับประมวลผลข้อมูลเฝ้าระวังเบื้องต้น
              </p>
              <p>
                ส่งผลให้ระบบ SilverLink Pro จะทำงานเป็นเพียงสมุดบันทึกทั่วไปเท่านั้น โดยระบบจะ <strong className="text-rose-600">ไม่แสดงการแจ้งเตือนจากข้อมูลและสถิติร่างกาย</strong>
              </p>
              <p className="font-medium text-foreground">
                คุณยืนยันที่จะดำเนินการต่อโดยไม่ใช้ AI ใช่หรือไม่?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAiWarning(false);
                  setConsentOptional(true);
                  submitData(true);
                }}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary-dark transition-colors"
              >
                กลับไปเปิดใช้งาน AI
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAiWarning(false);
                  submitData(false);
                }}
                className="w-full py-3 rounded-xl border border-border text-muted-foreground font-medium hover:bg-muted transition-colors"
              >
                ดำเนินการต่อแบบไม่ใช้ AI
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isEditMode ? "แก้ไขข้อมูลผู้สูงอายุ" : "ลงทะเบียนผู้สูงอายุ"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ข้อมูลจะถูกบันทึกลงฐานข้อมูล เพื่อใช้แสดงข้อมูลสุขภาพ
        </p>
        {!isEditMode && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">
            {!draftReady
              ? "กำลังตรวจสอบข้อมูลที่กรอกค้างไว้..."
              : draftNotice || (draftSavedAt ? "บันทึกแบบร่างอัตโนมัติแล้ว" : "ระบบจะบันทึกแบบร่างอัตโนมัติระหว่างกรอกข้อมูล")}
          </span>
          {draftSavedAt && (
            <button
              type="button"
              onClick={clearDraft}
              className="self-start text-sm font-medium text-rose-600 hover:underline sm:self-auto"
            >
              เริ่มใหม่
            </button>
          )}
        </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`flex-1 min-w-[80px] text-center py-2 px-1 rounded-xl text-xs font-medium transition-colors ${
              step === s.id
                ? "bg-primary text-primary-foreground"
                : step > s.id
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            <span className="block text-base mb-0.5">{s.icon}</span>
            {s.title}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-sm">{error}</div>
      )}

      <div className="glass-card p-6 space-y-5 animate-fade-in">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-semibold text-lg text-foreground flex items-center gap-2">
              <span className="text-2xl">📋</span> การยินยอมข้อมูล (Consent)
            </h2>
            <div className="p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-sm">
              <p className="font-medium mb-1">โปรดอ่านและให้ความยินยอมก่อนดำเนินการต่อ</p>
              <p>เนื่องจากข้อมูลสุขภาพถือเป็นข้อมูลความอ่อนไหวพิเศษ (Sensitive Data) ตามกฎหมาย PDPA การบันทึกข้อมูลเข้าสู่ระบบจึงต้องได้รับความยินยอมอย่างชัดเจน</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-foreground">ส่วนที่ 1: การประกาศสิทธิ์</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                  <input type="radio" name="relation" value="ผู้สูงอายุลงทะเบียนด้วยตนเอง" checked={consentRelation === "ผู้สูงอายุลงทะเบียนด้วยตนเอง"} onChange={(e) => setConsentRelation(e.target.value)} className="w-4 h-4 text-primary" />
                  <span className="text-sm">ผู้สูงอายุลงทะเบียนด้วยตนเอง</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                  <input type="radio" name="relation" value="บุตร/ธิดา หรือ ญาติ" checked={consentRelation === "บุตร/ธิดา หรือ ญาติ"} onChange={(e) => setConsentRelation(e.target.value)} className="w-4 h-4 text-primary" />
                  <span className="text-sm">บุตร/ธิดา หรือ ญาติ</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                  <input type="radio" name="relation" value="ผู้ปกครองตามกฎหมาย / ผู้รับมอบอำนาจ" checked={consentRelation === "ผู้ปกครองตามกฎหมาย / ผู้รับมอบอำนาจ"} onChange={(e) => setConsentRelation(e.target.value)} className="w-4 h-4 text-primary" />
                  <span className="text-sm">ผู้ปกครองตามกฎหมาย / ผู้รับมอบอำนาจ</span>
                </label>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-medium text-foreground">ส่วนที่ 2: ข้อตกลงที่บังคับ (เพื่อใช้งานแพลตฟอร์มได้)</h3>
              <label className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer">
                <input type="checkbox" checked={consentMandatory} onChange={(e) => setConsentMandatory(e.target.checked)} className="w-5 h-5 mt-0.5 text-primary rounded" />
                <span className="text-sm text-foreground/90 leading-relaxed">
                  ข้าพเจ้ายินยอมให้ประมวลผลข้อมูลสุขภาพและแชร์ข้อมูลนี้กับสมาชิกในครอบครัวและผู้ดูแลที่ข้าพเจ้าเชิญเข้าสู่ระบบ ตามกฎหมาย PDPA <strong className="text-primary">(บังคับ)</strong>
                </span>
              </label>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-medium text-foreground">ส่วนที่ 3: อนุญาตให้ใช้ AI ช่วยประมวลผลข้อมูลเฝ้าระวัง (ทางเลือก)</h3>
              <label className="flex items-start gap-3 p-4 rounded-xl border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                <input type="checkbox" checked={consentOptional} onChange={(e) => setConsentOptional(e.target.checked)} className="w-5 h-5 mt-0.5 text-primary rounded" />
                <span className="text-sm text-foreground/90 leading-relaxed">
                  ข้าพเจ้ายินยอมให้ระบบส่งข้อมูลสุขภาพและค่าสถิติร่างกายไปยังผู้ให้บริการ AI (เช่น Google/OpenAI) เพื่อประมวลผลและแสดงข้อมูลเฝ้าระวังเบื้องต้น โดยข้อมูลจะถูกใช้แบบครั้งต่อครั้งเท่านั้น และจะไม่ถูกนำไปบันทึกหรือฝึกฝนโมเดล AI (Zero Data Retention / No Training) เพื่อความปลอดภัยสูงสุด
                </span>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <span className="text-2xl">👤</span> ข้อมูลส่วนบุคคลพื้นฐาน
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">ชื่อ *</label>
                <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">นามสกุล *</label>
                <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">ชื่อเล่น</label>
                <input className={inputClass} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="เช่น ป้าแดง" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">วันเกิด * {age != null && <span className="text-primary">({age} ปี)</span>}</label>
                <input type="date" className={inputClass} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">เพศ</label>
                <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="female">หญิง</option>
                  <option value="male">ชาย</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">กรุ๊ปเลือด</label>
                <select className={inputClass} value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
                  <option value="">—</option>
                  {["A", "B", "AB", "O"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">น้ำหนัก (kg)</label>
                <input type="number" className={inputClass} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">ส่วนสูง (cm) {bmi && <span className="text-muted-foreground">BMI {bmi}</span>}</label>
                <input type="number" className={inputClass} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1 block">ห้อง / ที่พัก</label>
                <input className={inputClass} value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="เช่น 201" />
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-semibold text-lg">📋 ข้อมูลสุขภาพพื้นฐาน (RAG Context)</h2>

            <div>
              <label className="text-sm font-medium mb-2 block">โรคประจำตัว</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_DISEASES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleItem(underlyingDiseases, d, setUnderlyingDiseases)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      underlyingDiseases.includes(d)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="เพิ่มโรคอื่น..."
                  value={customDisease}
                  onChange={(e) => setCustomDisease(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customDisease.trim()) {
                      setUnderlyingDiseases([...underlyingDiseases, customDisease.trim()]);
                      setCustomDisease("");
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-muted text-sm font-medium shrink-0"
                >
                  เพิ่ม
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">ประวัติการแพ้ (เช่น อาหาร, สิ่งแวดล้อม) ⚠️</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_ALLERGIES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleItem(allergies, a, setAllergies)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      allergies.includes(a)
                        ? "bg-rose-600 text-white border-rose-600"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="เพิ่มสารที่แพ้..."
                  value={customAllergy}
                  onChange={(e) => setCustomAllergy(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customAllergy.trim()) {
                      setAllergies([...allergies, customAllergy.trim()]);
                      setCustomAllergy("");
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-muted text-sm font-medium shrink-0"
                >
                  เพิ่ม
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">ข้อจำกัดทางร่างกาย</label>
              <select className={inputClass} value={mobilityStatus} onChange={(e) => setMobilityStatus(e.target.value as MobilityStatus)}>
                {MOBILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <p className="text-sm font-semibold">⭐ เกณฑ์ค่าสถิติร่างกายปกติ (Baseline Vitals)</p>
              <p className="text-xs text-muted-foreground">AI จะใช้ค่านี้แทนเกณฑ์ทั่วไป — ลด False Alarm</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">ความดันบน</label>
                  <input type="number" className={inputClass} placeholder="140" value={baselineSystolic} onChange={(e) => setBaselineSystolic(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ความดันล่าง</label>
                  <input type="number" className={inputClass} placeholder="90" value={baselineDiastolic} onChange={(e) => setBaselineDiastolic(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">อุณหภูมิ °C</label>
                  <input type="number" step="0.1" className={inputClass} placeholder="36.5" value={baselineTemperature} onChange={(e) => setBaselineTemperature(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ชีพจร</label>
                  <input type="number" className={inputClass} placeholder="72" value={baselineHeartRate} onChange={(e) => setBaselineHeartRate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">SpO2 %</label>
                  <input type="number" className={inputClass} placeholder="96" value={baselineOxygenSat} onChange={(e) => setBaselineOxygenSat(e.target.value)} />
                </div>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-semibold text-lg">💊 ข้อมูลกิจวัตรและวิตามิน/ยา</h2>
            <p className="text-sm text-muted-foreground">เพิ่มรายการทีละตัว — ระบบจะสร้าง Checklist ให้ผู้ดูแลติ๊กทุกวัน</p>

            <div className="space-y-4">
              {medications.map((med, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">รายการที่ {idx + 1}</span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                        className="text-xs text-rose-600"
                      >
                        ลบ
                      </button>
                    )}
                  </div>
                  <input className={inputClass} placeholder="ชื่อรายการ เช่น วิตามินซี, ยาลดความดัน" value={med.name} onChange={(e) => {
                    const next = [...medications];
                    next[idx] = { ...med, name: e.target.value };
                    setMedications(next);
                  }} />
                  <input className={inputClass} placeholder="ขนาด / ปริมาณ เช่น 500 mg" value={med.strength ?? ""} onChange={(e) => {
                    const next = [...medications];
                    next[idx] = { ...med, strength: e.target.value };
                    setMedications(next);
                  }} />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      min="0.01"
                      step="0.25"
                      className={inputClass}
                      placeholder="จำนวน เช่น 1, 0.5, 2"
                      value={med.doseAmount ?? ""}
                      onChange={(e) => {
                        const next = [...medications];
                        next[idx] = { ...med, doseAmount: e.target.value, dosage: `${e.target.value} ${med.doseUnit}`.trim() };
                        setMedications(next);
                      }}
                    />
                    <select
                      className={inputClass}
                      value={med.doseUnit || "เม็ด"}
                      onChange={(e) => {
                        const next = [...medications];
                        next[idx] = { ...med, doseUnit: e.target.value, dosage: `${med.doseAmount} ${e.target.value}`.trim() };
                        setMedications(next);
                      }}
                    >
                      {MEDICATION_DOSE_UNITS.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={med.isPrn ?? false}
                      onChange={(e) => {
                        const next = [...medications];
                        next[idx] = {
                          ...med,
                          isPrn: e.target.checked,
                          timeOfDay: e.target.checked ? [] : (med.timeOfDay.length ? med.timeOfDay : ["MORNING"]),
                        };
                        setMedications(next);
                      }}
                    />
                    <span>💊 ทาน/ใช้เฉพาะเมื่อจำเป็น (PRN)</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={med.selfAdministered ?? false}
                      onChange={(e) => {
                        const next = [...medications];
                        next[idx] = { ...med, selfAdministered: e.target.checked };
                        setMedications(next);
                      }}
                    />
                    <span>ผู้สูงอายุทานยานี้เองได้</span>
                  </label>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">ช่วงเวลา</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(TIME_OF_DAY_LABELS) as TimeOfDay[]).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          disabled={med.isPrn}
                          onClick={() => {
                            const next = [...medications];
                            const times = med.timeOfDay.includes(slot)
                              ? med.timeOfDay.filter((t) => t !== slot)
                              : [...med.timeOfDay, slot];
                            next[idx] = { ...med, timeOfDay: times.length ? times : ["MORNING"] };
                            setMedications(next);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border disabled:opacity-40 disabled:cursor-not-allowed ${
                            med.timeOfDay.includes(slot)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border"
                          }`}
                        >
                          {TIME_OF_DAY_LABELS[slot]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {!med.isPrn && (
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground block">ความถี่</label>
                      <select
                        className={inputClass}
                        value={med.frequency ?? "DAILY"}
                        onChange={(e) => {
                          const next = [...medications];
                          next[idx] = { ...med, frequency: e.target.value as MedicationInput["frequency"], frequencyDays: [] };
                          setMedications(next);
                        }}
                      >
                        {Object.entries(MEDICATION_FREQUENCY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      {med.frequency === "CUSTOM_DAYS" && (
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAY_LABELS.map((label, day) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => {
                                const next = [...medications];
                                const days = med.frequencyDays.includes(day)
                                  ? med.frequencyDays.filter((d) => d !== day)
                                  : [...med.frequencyDays, day].sort();
                                next[idx] = { ...med, frequencyDays: days };
                                setMedications(next);
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                                med.frequencyDays.includes(day)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <input className={inputClass} placeholder="หมายเหตุ เช่น หลังอาหารทันที" value={med.instruction ?? ""} onChange={(e) => {
                    const next = [...medications];
                    next[idx] = { ...med, instruction: e.target.value };
                    setMedications(next);
                  }} />
                  <details className="rounded-lg border border-dashed border-border px-3 py-2">
                    <summary className="cursor-pointer select-none text-sm font-medium text-primary list-none">
                      + เพิ่มรายละเอียดเสริม (ไม่บังคับ)
                    </summary>
                    <div className="mt-3 space-y-3">
                      <input
                        className={inputClass}
                        placeholder="เหตุผลที่ใช้ เช่น บำรุงร่างกาย, ลดความดัน"
                        value={med.indication ?? ""}
                        onChange={(e) => {
                          const next = [...medications];
                          next[idx] = { ...med, indication: e.target.value };
                          setMedications(next);
                        }}
                      />
                      <input
                        className={inputClass}
                        placeholder="ลักษณะ เช่น เม็ดกลมสีเหลือง"
                        value={med.appearance ?? ""}
                        onChange={(e) => {
                          const next = [...medications];
                          next[idx] = { ...med, appearance: e.target.value };
                          setMedications(next);
                        }}
                      />
                    </div>
                  </details>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setMedications([...medications, emptyMed()])}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-primary/40 text-sm font-medium text-primary hover:bg-primary/5"
            >
              + เพิ่มรายการ
            </button>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="font-semibold text-lg">🚑 การจัดการเหตุฉุกเฉิน</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1 block">สถานพยาบาล/คลินิกประจำ</label>
                <input className={inputClass} value={preferredHospital} onChange={(e) => setPreferredHospital(e.target.value)} placeholder="เช่น โรงพยาบาลศิริราช, คลินิกใกล้บ้าน" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">เลข HN</label>
                <input className={inputClass} value={hospitalNumber} onChange={(e) => setHospitalNumber(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">สิทธิ์การรักษา</label>
                <select className={inputClass} value={insuranceType} onChange={(e) => setInsuranceType(e.target.value as InsuranceType)}>
                  {INSURANCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium">เบอร์ติดต่อฉุกเฉิน *</label>
              {emergencyContacts.map((c, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border grid sm:grid-cols-3 gap-3">
                  <input className={inputClass} placeholder="ชื่อ" value={c.name} onChange={(e) => {
                    const next = [...emergencyContacts];
                    next[idx] = { ...c, name: e.target.value };
                    setEmergencyContacts(next);
                  }} />
                  <input className={inputClass} placeholder="เบอร์โทร" value={c.phone} onChange={(e) => {
                    const next = [...emergencyContacts];
                    next[idx] = { ...c, phone: e.target.value };
                    setEmergencyContacts(next);
                  }} />
                  <input className={inputClass} placeholder="ความสัมพันธ์" value={c.relation ?? ""} onChange={(e) => {
                    const next = [...emergencyContacts];
                    next[idx] = { ...c, relation: e.target.value };
                    setEmergencyContacts(next);
                  }} />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEmergencyContacts([...emergencyContacts, emptyContact()])}
                className="text-sm text-primary font-medium"
              >
                + เพิ่มผู้ติดต่อ
              </button>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="font-semibold text-lg">✓ ตรวจสอบก่อนบันทึก</h2>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{firstName} {lastName} {nickname && `(${nickname})`}</p>
                <p className="text-muted-foreground">อายุ {age} ปี · ห้อง {roomNumber || "—"} · BMI {bmi ?? "—"}</p>
              </div>
              {underlyingDiseases.length > 0 && (
                <p><span className="font-medium">โรคประจำตัว:</span> {underlyingDiseases.join(", ")}</p>
              )}
              {allergies.length > 0 && (
                <p className="text-rose-600"><span className="font-medium">แพ้:</span> {allergies.join(", ")}</p>
              )}
              <p><span className="font-medium">Baseline BP:</span> {baselineSystolic || "—"}/{baselineDiastolic || "—"}</p>
              <p><span className="font-medium">กิจวัตร/วิตามิน:</span> {payload.medications.length} รายการ</p>
              <p><span className="font-medium">สถานพยาบาล:</span> {preferredHospital || "—"} (HN {hospitalNumber || "—"})</p>
              <p className="text-xs text-muted-foreground pt-2">
                หลังบันทึก ข้อมูลจะถูกบันทึกลงฐานข้อมูล เพื่อใช้แสดงข้อมูลสุขภาพ
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => { setError(""); setStep((s) => s - 1); }}
            className="flex-1 py-3 rounded-xl border border-border font-medium hover:bg-muted transition-colors"
          >
            ย้อนกลับ
          </button>
        )}
        {step < STEPS.length ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary-dark transition-colors"
          >
            ถัดไป
          </button>
        ) : (
          <button
            type="button"
            onClick={handleInitialSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
          </button>
        )}
      </div>
      </div>
    </>
  );
}
