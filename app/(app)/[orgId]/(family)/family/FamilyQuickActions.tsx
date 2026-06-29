"use client";

import { useState } from "react";
import MedicationChecklist from "../../(caregiver)/caregiver/MedicationChecklist";
import VitalSignsForm, { type VitalData } from "../../(caregiver)/caregiver/VitalSignsForm";
import type { VitalBaseline } from "@/lib/vital-alerts";

type LatestVitals = {
  systolic: number | null;
  diastolic: number | null;
  temperature: number | null;
  heartRate: number | null;
  oxygenSat: number | null;
  measuredAt: string;
} | null;

function baselineMidpoint(
  value: number | null | undefined,
  lower: number | null | undefined,
  upper: number | null | undefined,
  fallback: number
) {
  if (value != null) return value;
  if (lower != null && upper != null) return Math.round(((lower + upper) / 2) * 10) / 10;
  if (lower != null) return lower;
  if (upper != null) return upper;
  return fallback;
}

function vitalsFromLatest(latest: LatestVitals, baseline?: VitalBaseline | null): VitalData {
  return {
    systolic:
      latest?.systolic ??
      baselineMidpoint(baseline?.baselineSystolic, baseline?.baselineSystolicLower, baseline?.baselineSystolicUpper, 120),
    diastolic:
      latest?.diastolic ??
      baselineMidpoint(baseline?.baselineDiastolic, baseline?.baselineDiastolicLower, baseline?.baselineDiastolicUpper, 80),
    temperature:
      latest?.temperature ??
      baselineMidpoint(baseline?.baselineTemperature, baseline?.baselineTemperatureLower, baseline?.baselineTemperatureUpper, 36.5),
    heartRate:
      latest?.heartRate ??
      baselineMidpoint(baseline?.baselineHeartRate, baseline?.baselineHeartRateLower, baseline?.baselineHeartRateUpper, 72),
    oxygenSat:
      latest?.oxygenSat ??
      baselineMidpoint(baseline?.baselineOxygenSat, baseline?.baselineOxygenSatMin, baseline?.baselineOxygenSatMax, 98),
  };
}

export default function FamilyQuickActions({
  orgId,
  patientId,
  latestVitals,
  baseline,
  onSaved,
}: {
  orgId: string;
  patientId: string;
  latestVitals: LatestVitals;
  baseline?: VitalBaseline | null;
  onSaved: () => void;
}) {
  const [vitals, setVitals] = useState<VitalData>(() => vitalsFromLatest(latestVitals, baseline));
  const [savingVitals, setSavingVitals] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const saveVitals = async () => {
    setSavingVitals(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, patientId, ...vitals, notes: "recorded from family portal" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save vitals failed");
      setMessage("บันทึกสัญญาณชีพแล้ว");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save vitals failed");
    } finally {
      setSavingVitals(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <VitalSignsForm vitals={vitals} onChange={setVitals} baseline={baseline} />
        <button
          type="button"
          onClick={saveVitals}
          disabled={savingVitals}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingVitals ? "กำลังบันทึก..." : "บันทึกสัญญาณชีพ"}
        </button>
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
      <MedicationChecklist
        orgId={orgId}
        patientId={patientId}
        mode="family"
        onAfterChange={onSaved}
      />
    </section>
  );
}
