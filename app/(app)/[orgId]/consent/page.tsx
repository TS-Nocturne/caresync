"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const CONSENT_ITEMS = [
  {
    type: "PDPA_GENERAL",
    title: "ยินยอมตาม PDPA / HIPAA",
    description: "ยินยอมให้เก็บและประมวลผลข้อมูลสุขภาพส่วนบุคคลตามกฎหมายคุ้มครองข้อมูล",
  },
  {
    type: "DATA_SHARING_NURSING",
    title: "แชร์ข้อมูลกับผู้ดูแล",
    description: "ยินยอมให้ทีมผู้ดูแลเข้าถึงข้อมูลสุขภาพเพื่อการดูแล",
  },
  {
    type: "DATA_SHARING_FAMILY",
    title: "แชร์ข้อมูลกับครอบครัว",
    description: "ยินยอมให้ลูกหลานและญาติที่ได้รับอนุญาตดูข้อมูลสุขภาพ",
  },
  {
    type: "AI_PROCESSING",
    title: "ใช้ AI ประมวลผลข้อมูลเฝ้าระวังเบื้องต้น",
    description: "ยินยอมให้ระบบ AI ประมวลผลอาการและสัญญาณชีพเพื่อแสดงข้อมูลประกอบการติดตามอาการ (ข้อมูลจะถูก anonymize ก่อนส่งต่อ)",
  },
];

interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export default function ConsentPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [grantedByName, setGrantedByName] = useState("");
  const [grantedByRelation, setGrantedByRelation] = useState("ผู้สูงอายุเอง");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/patients?orgId=${orgId}`);
      const json = await res.json();
      const first = json.data?.[0] as PatientSummary | undefined;
      if (first) {
        setPatient(first);
        const consentRes = await fetch(`/api/consent?orgId=${orgId}&patientId=${first.id}`);
        const consentJson = await consentRes.json();
        const map: Record<string, boolean> = {};
        for (const c of consentJson.data ?? []) {
          map[c.consentType] = c.granted;
        }
        setGranted(map);
      }
    }
    load();
  }, [orgId]);

  const saveConsent = async (type: string, value: boolean) => {
    if (!patient || !grantedByName.trim()) {
      setError("กรุณากรอกชื่อผู้ให้ความยินยอม");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          patientId: patient.id,
          consentType: type,
          granted: value,
          grantedByName: grantedByName.trim(),
          grantedByRelation,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ");
      setGranted((prev) => ({ ...prev, [type]: value }));
      setMessage(value ? "บันทึกความยินยอมแล้ว" : "ถอนความยินยอมแล้ว");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">การยินยอมข้อมูล (PDPA / HIPAA)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {patient
            ? `ผู้สูงอายุ: ${patient.firstName} ${patient.lastName}`
            : "กำลังโหลด..."}
        </p>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold">ผู้ให้ความยินยอม</h2>
        <input
          type="text"
          value={grantedByName}
          onChange={(e) => setGrantedByName(e.target.value)}
          placeholder="ชื่อ-นามสกุล (ผู้สูงอายุหรือผู้ปกครองตามกฎหมาย)"
          className="w-full rounded-xl border border-input px-4 py-2.5 text-sm"
        />
        <select
          value={grantedByRelation}
          onChange={(e) => setGrantedByRelation(e.target.value)}
          className="w-full rounded-xl border border-input px-4 py-2.5 text-sm"
        >
          <option value="ผู้สูงอายุเอง">ผู้สูงอายุเอง</option>
          <option value="บุตร/ธิดา">บุตร/ธิดา</option>
          <option value="คู่สมรส">คู่สมรส</option>
          <option value="ผู้ปกครองตามกฎหมาย">ผู้ปกครองตามกฎหมาย</option>
        </select>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-600 text-sm border border-rose-100">{error}</div>
      )}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm border border-emerald-100">{message}</div>
      )}

      <div className="space-y-4">
        {CONSENT_ITEMS.map((item) => (
          <div key={item.type} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            </div>
            <button
              type="button"
              disabled={saving || !patient}
              onClick={() => saveConsent(item.type, !granted[item.type])}
              className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                granted[item.type]
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-primary text-primary-foreground hover:bg-primary-dark"
              }`}
            >
              {granted[item.type] ? "✓ ยินยอมแล้ว" : "กดยินยอม"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
