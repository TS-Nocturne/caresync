"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  COMMON_ALLERGIES,
  COMMON_DISEASES,
  TIME_OF_DAY_LABELS,
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
  { id: 3, title: "ประวัติการแพทย์", icon: "🏥" },
  { id: 4, title: "รายการยา", icon: "💊" },
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
  { value: "SELF_PAY", label: "จ่ายเอง" },
];

const emptyMed = (): MedicationInput => ({
  name: "",
  dosage: "",
  timeOfDay: ["MORNING"],
  instruction: "",
});

const emptyContact = (): EmergencyContactInput => ({
  name: "",
  phone: "",
  relation: "",
  isPrimary: false,
});

export default function PatientRegistrationWizard() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [consentRelation, setConsentRelation] = useState("");
  const [consentMandatory, setConsentMandatory] = useState(false);
  const [consentOptional, setConsentOptional] = useState(false);
  const [showAiWarning, setShowAiWarning] = useState(false);

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

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!consentRelation) return "กรุณาระบุความสัมพันธ์กับผู้ป่วย";
      if (!consentMandatory) return "คุณต้องยินยอมเงื่อนไขพื้นฐานก่อนดำเนินการต่อ";
    }
    if (s === 2) {
      if (!firstName.trim() || !lastName.trim()) return "กรุณากรอกชื่อ-นามสกุล";
      if (!dateOfBirth) return "กรุณาเลือกวันเกิด";
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
    medications: medications.filter((m) => m.name.trim() && m.dosage.trim()),
  }), [
    orgId, firstName, lastName, nickname, dateOfBirth, gender, bloodType,
    weightKg, heightCm, roomNumber, underlyingDiseases, allergies, mobilityStatus,
    baselineSystolic, baselineDiastolic, baselineTemperature, baselineHeartRate,
    baselineOxygenSat, preferredHospital, hospitalNumber, insuranceType,
    emergencyContacts, medications, consentRelation, consentMandatory, consentOptional
  ]);

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const submitData = async (overrideConsentOptional: boolean | null = null) => {
    setSaving(true);
    setError("");
    try {
      const finalPayload = { ...payload };
      if (overrideConsentOptional !== null) {
        finalPayload.consentOptional = overrideConsentOptional;
      }

      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ลงทะเบียนไม่สำเร็จ");
      router.push(`/${orgId}/dashboard?registered=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลงทะเบียนไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleInitialSubmit = () => {
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
                ส่งผลให้ระบบ SilverLink Pro จะทำงานเป็นเพียงสมุดบันทึกอาการเท่านั้น โดยระบบจะ <strong className="text-rose-600">ไม่แสดงสัญญาณเฝ้าระวังจากข้อมูลยาและสัญญาณชีพ</strong>
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
        <h1 className="text-2xl font-bold">ลงทะเบียนผู้สูงอายุ</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ข้อมูลจะถูก index ลง Pinecone เพื่อใช้แสดงข้อมูลสุขภาพประกอบการติดตามอาการ
        </p>
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
                  <input type="radio" name="relation" value="ผู้ป่วยลงทะเบียนด้วยตนเอง" checked={consentRelation === "ผู้ป่วยลงทะเบียนด้วยตนเอง"} onChange={(e) => setConsentRelation(e.target.value)} className="w-4 h-4 text-primary" />
                  <span className="text-sm">ผู้ป่วยลงทะเบียนด้วยตนเอง</span>
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
              <h3 className="font-medium text-foreground">ส่วนที่ 2: ข้อตกลงที่บังคับ (เพื่อใช้งานแอปได้)</h3>
              <label className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer">
                <input type="checkbox" checked={consentMandatory} onChange={(e) => setConsentMandatory(e.target.checked)} className="w-5 h-5 mt-0.5 text-primary rounded" />
                <span className="text-sm text-foreground/90 leading-relaxed">
                  ข้าพเจ้ายินยอมให้ประมวลผลข้อมูลสุขภาพและแชร์ข้อมูลนี้กับสมาชิกในครอบครัวและพยาบาลที่ข้าพเจ้าเชิญเข้าสู่ระบบ ตามกฎหมาย PDPA <strong className="text-primary">(บังคับ)</strong>
                </span>
              </label>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-medium text-foreground">ส่วนที่ 3: อนุญาตให้ใช้ AI ช่วยประมวลผลข้อมูลเฝ้าระวัง (ทางเลือก)</h3>
              <label className="flex items-start gap-3 p-4 rounded-xl border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                <input type="checkbox" checked={consentOptional} onChange={(e) => setConsentOptional(e.target.checked)} className="w-5 h-5 mt-0.5 text-primary rounded" />
                <span className="text-sm text-foreground/90 leading-relaxed">
                  ข้าพเจ้ายินยอมให้ระบบส่งข้อมูลอาการและสัญญาณชีพไปยังผู้ให้บริการ AI (เช่น Google/OpenAI) เพื่อประมวลผลและแสดงข้อมูลเฝ้าระวังเบื้องต้น โดยข้อมูลจะถูกใช้แบบครั้งต่อครั้งเท่านั้น และจะไม่ถูกนำไปบันทึกหรือฝึกฝนโมเดล AI (Zero Data Retention / No Training) เพื่อความปลอดภัยสูงสุด
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
            <h2 className="font-semibold text-lg">🏥 ประวัติทางการแพทย์ (RAG Context)</h2>

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
              <label className="text-sm font-medium mb-2 block">ประวัติแพ้ยา / แพ้อาหาร ⚠️</label>
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
              <p className="text-sm font-semibold">⭐ เกณฑ์สัญญาณชีพปกติ (Baseline Vitals)</p>
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
            <h2 className="font-semibold text-lg">💊 ข้อมูลยาตั้งต้น</h2>
            <p className="text-sm text-muted-foreground">เพิ่มรายการยาทีละตัว — ระบบจะสร้าง Checklist ให้พยาบาลติ๊กทุกวัน</p>

            <div className="space-y-4">
              {medications.map((med, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">ยาที่ {idx + 1}</span>
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
                  <input className={inputClass} placeholder="ชื่อยา เช่น Amlodipine" value={med.name} onChange={(e) => {
                    const next = [...medications];
                    next[idx] = { ...med, name: e.target.value };
                    setMedications(next);
                  }} />
                  <input className={inputClass} placeholder="ปริมาณ เช่น 1 เม็ด (5mg)" value={med.dosage} onChange={(e) => {
                    const next = [...medications];
                    next[idx] = { ...med, dosage: e.target.value };
                    setMedications(next);
                  }} />
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">ช่วงเวลา</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(TIME_OF_DAY_LABELS) as TimeOfDay[]).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            const next = [...medications];
                            const times = med.timeOfDay.includes(slot)
                              ? med.timeOfDay.filter((t) => t !== slot)
                              : [...med.timeOfDay, slot];
                            next[idx] = { ...med, timeOfDay: times.length ? times : ["MORNING"] };
                            setMedications(next);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border ${
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
                  <input className={inputClass} placeholder="หมายเหตุ เช่น หลังอาหารทันที" value={med.instruction ?? ""} onChange={(e) => {
                    const next = [...medications];
                    next[idx] = { ...med, instruction: e.target.value };
                    setMedications(next);
                  }} />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setMedications([...medications, emptyMed()])}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-primary/40 text-sm font-medium text-primary hover:bg-primary/5"
            >
              + เพิ่มรายการยา
            </button>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="font-semibold text-lg">🚑 การจัดการเหตุฉุกเฉิน</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1 block">โรงพยาบาลประจำ</label>
                <input className={inputClass} value={preferredHospital} onChange={(e) => setPreferredHospital(e.target.value)} placeholder="เช่น โรงพยาบาลศิริราช" />
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
              <p><span className="font-medium">ยา:</span> {payload.medications.length} รายการ</p>
              <p><span className="font-medium">โรงพยาบาล:</span> {preferredHospital || "—"} (HN {hospitalNumber || "—"})</p>
              <p className="text-xs text-muted-foreground pt-2">
                หลังบันทึก ระบบจะ index ข้อมูลลง Pinecone อัตโนมัติเพื่อใช้แสดงข้อมูลประกอบการติดตามอาการ
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
            {saving ? "กำลังบันทึก..." : "บันทึก & Index ลง Pinecone"}
          </button>
        )}
      </div>
      </div>
    </>
  );
}
