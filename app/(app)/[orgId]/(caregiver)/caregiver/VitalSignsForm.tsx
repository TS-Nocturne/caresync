"use client";

import { useEffect, useState } from "react";
import MetricCard from "@/app/components/ui/MetricCard";
import {
  getBloodPressureStatus,
  getVitalMetricStatus,
  type VitalBaseline,
} from "@/lib/vital-alerts";

export interface VitalData {
  systolic: number;
  diastolic: number;
  temperature: number;
  heartRate: number;
  oxygenSat: number;
}

export default function VitalSignsForm({
  vitals,
  onChange,
  baseline,
}: {
  vitals: VitalData;
  onChange: (vitals: VitalData) => void;
  baseline?: VitalBaseline | null;
}) {
  const [draftValues, setDraftValues] = useState<Record<keyof VitalData, string>>({
    systolic: String(vitals.systolic),
    diastolic: String(vitals.diastolic),
    temperature: vitals.temperature.toFixed(1),
    heartRate: String(vitals.heartRate),
    oxygenSat: String(vitals.oxygenSat),
  });
  const [focusedKey, setFocusedKey] = useState<keyof VitalData | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDraftValues((current) => ({
        systolic: focusedKey === "systolic" ? current.systolic : String(vitals.systolic),
        diastolic: focusedKey === "diastolic" ? current.diastolic : String(vitals.diastolic),
        temperature: focusedKey === "temperature" ? current.temperature : vitals.temperature.toFixed(1),
        heartRate: focusedKey === "heartRate" ? current.heartRate : String(vitals.heartRate),
        oxygenSat: focusedKey === "oxygenSat" ? current.oxygenSat : String(vitals.oxygenSat),
      }));
    }, 0);

    return () => window.clearTimeout(id);
  }, [focusedKey, vitals]);

  const update = (key: keyof VitalData, val: number) => {
    onChange({ ...vitals, [key]: val });
  };

  const updateText = (key: keyof VitalData, rawValue: string, step: number) => {
    const normalized = rawValue
      .replace(/[^\d.]/g, "")
      .replace(/(\..*)\./g, "$1")
      .replace(/^0+(?=\d)/, "");

    setDraftValues((current) => ({ ...current, [key]: normalized }));
    if (normalized === "" || normalized === ".") return;

    const nextValue = Number(normalized);
    if (!Number.isFinite(nextValue)) return;
    update(key, step % 1 === 0 ? Math.round(nextValue) : nextValue);
  };

  const restoreText = (key: keyof VitalData, step: number) => {
    const value = vitals[key];
    setFocusedKey(null);
    setDraftValues((current) => ({
      ...current,
      [key]: step % 1 === 0 ? String(value) : value.toFixed(1),
    }));
  };

  const fields = [
    {
      key: "systolic" as const,
      label: "ความดัน (บน)",
      unit: "mmHg",
      min: 60,
      max: 200,
      step: 1,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      ),
    },
    {
      key: "diastolic" as const,
      label: "ความดัน (ล่าง)",
      unit: "mmHg",
      min: 40,
      max: 130,
      step: 1,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      ),
    },
    {
      key: "temperature" as const,
      label: "อุณหภูมิ",
      unit: "°C",
      min: 34,
      max: 42,
      step: 0.1,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
        </svg>
      ),
    },
    {
      key: "heartRate" as const,
      label: "ชีพจร",
      unit: "bpm",
      min: 40,
      max: 180,
      step: 1,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5h2.382a1.5 1.5 0 0 0 1.342-.83l1.526-3.051a.75.75 0 0 1 1.414.164l2.172 6.517a.75.75 0 0 0 1.393.1l1.83-4.574a1.5 1.5 0 0 1 1.393-.943H21" />
        </svg>
      ),
    },
    {
      key: "oxygenSat" as const,
      label: "ออกซิเจนในเลือด",
      unit: "%",
      min: 80,
      max: 100,
      step: 1,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="glass-card p-4 sm:p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5h2.382a1.5 1.5 0 0 0 1.342-.83l1.526-3.051a.75.75 0 0 1 1.414.164l2.172 6.517a.75.75 0 0 0 1.393.1l1.83-4.574a1.5 1.5 0 0 1 1.393-.943H21" />
        </svg>
        <h2 className="text-lg font-semibold">ค่าสถิติร่างกาย</h2>
      </div>

      {/* Metric Overview */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <MetricCard
          label="ความดัน"
          value={`${vitals.systolic}/${vitals.diastolic}`}
          unit="mmHg"
          status={getBloodPressureStatus(vitals.systolic, vitals.diastolic, baseline)}
          icon={fields[0].icon}
        />
        <MetricCard
          label="อุณหภูมิ"
          value={vitals.temperature.toFixed(1)}
          unit="°C"
          status={getVitalMetricStatus("temperature", vitals.temperature, baseline)}
          icon={fields[2].icon}
        />
        <MetricCard
          label="ชีพจร"
          value={vitals.heartRate}
          unit="bpm"
          status={getVitalMetricStatus("heartRate", vitals.heartRate, baseline)}
          icon={fields[3].icon}
        />
      </div>

      {/* Input Sliders */}
      <div className="space-y-5">
        {fields.map((f) => {
          const val = vitals[f.key];
          const status = getVitalMetricStatus(f.key, val, baseline);
          const statusColor =
            status === "critical"
              ? "accent-red-500"
              : status === "warning"
                ? "accent-amber-500"
                : "accent-teal-500";

          return (
            <div key={f.key} className="space-y-2">
              <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  {f.icon}
                  {f.label}
                </label>
                <div className="flex items-center gap-2 min-[420px]:justify-end">
                  <input
                    type="text"
                    inputMode={f.step % 1 === 0 ? "numeric" : "decimal"}
                    value={draftValues[f.key]}
                    onFocus={() => setFocusedKey(f.key)}
                    onChange={(e) => updateText(f.key, e.target.value, f.step)}
                    onBlur={() => restoreText(f.key, f.step)}
                    className={`w-20 text-right text-sm font-bold tabular-nums rounded-lg border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring ${
                      status === "critical"
                        ? "text-status-critical"
                        : status === "warning"
                          ? "text-status-warning"
                          : "text-foreground"
                    }`}
                  />
                  <span className="text-xs text-muted-foreground w-10">
                    {f.unit}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={val}
                onChange={(e) => update(f.key, Number(e.target.value))}
                className={`w-full h-2 rounded-full appearance-none cursor-pointer ${statusColor}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
