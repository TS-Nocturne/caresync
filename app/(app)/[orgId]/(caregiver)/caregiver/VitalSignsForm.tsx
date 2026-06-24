"use client";

import MetricCard from "@/app/components/ui/MetricCard";

export interface VitalData {
  systolic: number;
  diastolic: number;
  temperature: number;
  heartRate: number;
  oxygenSat: number;
}

function getStatus(key: string, val: number): "ok" | "warning" | "critical" {
  const ranges: Record<string, { warn: [number, number]; crit: [number, number] }> = {
    systolic: { warn: [130, 140], crit: [141, 999] },
    diastolic: { warn: [85, 90], crit: [91, 999] },
    temperature: { warn: [37.5, 38], crit: [38.1, 99] },
    heartRate: { warn: [90, 100], crit: [101, 999] },
    oxygenSat: { warn: [93, 95], crit: [0, 92] },
  };
  const r = ranges[key];
  if (!r) return "ok";
  if (key === "oxygenSat") {
    if (val <= r.crit[1]) return "critical";
    if (val <= r.warn[1]) return "warning";
    return "ok";
  }
  if (val >= r.crit[0]) return "critical";
  if (val >= r.warn[0]) return "warning";
  return "ok";
}

export default function VitalSignsForm({
  vitals,
  onChange,
}: {
  vitals: VitalData;
  onChange: (vitals: VitalData) => void;
}) {
  const update = (key: keyof VitalData, val: number) => {
    onChange({ ...vitals, [key]: val });
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
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5h2.382a1.5 1.5 0 0 0 1.342-.83l1.526-3.051a.75.75 0 0 1 1.414.164l2.172 6.517a.75.75 0 0 0 1.393.1l1.83-4.574a1.5 1.5 0 0 1 1.393-.943H21" />
        </svg>
        <h2 className="text-lg font-semibold">สัญญาณชีพ</h2>
      </div>

      {/* Metric Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <MetricCard
          label="ความดัน"
          value={`${vitals.systolic}/${vitals.diastolic}`}
          unit="mmHg"
          status={getStatus("systolic", vitals.systolic)}
          icon={fields[0].icon}
        />
        <MetricCard
          label="อุณหภูมิ"
          value={vitals.temperature.toFixed(1)}
          unit="°C"
          status={getStatus("temperature", vitals.temperature)}
          icon={fields[2].icon}
        />
        <MetricCard
          label="ชีพจร"
          value={vitals.heartRate}
          unit="bpm"
          status={getStatus("heartRate", vitals.heartRate)}
          icon={fields[3].icon}
        />
      </div>

      {/* Input Sliders */}
      <div className="space-y-5">
        {fields.map((f) => {
          const val = vitals[f.key];
          const status = getStatus(f.key, val);
          const statusColor =
            status === "critical"
              ? "accent-red-500"
              : status === "warning"
                ? "accent-amber-500"
                : "accent-teal-500";

          return (
            <div key={f.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  {f.icon}
                  {f.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => update(f.key, Number(e.target.value))}
                    min={f.min}
                    max={f.max}
                    step={f.step}
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
