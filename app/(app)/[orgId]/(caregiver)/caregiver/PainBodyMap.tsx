"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getPainColor,
  getPainSeverity,
  REGION_LABELS,
  REGION_TO_MUSCLE,
  type PainPoint,
  type PainRegion,
} from "./pain-body-config";

type BodyGroupId = "head" | "torso" | "arm" | "leg";

const BODY_GROUPS: Array<{ id: BodyGroupId; label: string; regions: PainRegion[] }> = [
  {
    id: "head",
    label: "ศีรษะ / คอ / บ่า",
    regions: ["head", "neck", "trapezius"],
  },
  {
    id: "torso",
    label: "ลำตัว",
    regions: ["left-chest", "right-chest", "abs", "obliques", "upper-back", "lower-back"],
  },
  {
    id: "arm",
    label: "แขน / ไหล่",
    regions: [
      "left-front-deltoids",
      "right-front-deltoids",
      "left-back-deltoids",
      "right-back-deltoids",
      "biceps",
      "triceps",
      "forearm",
    ],
  },
  {
    id: "leg",
    label: "ขา / เท้า",
    regions: [
      "quadriceps",
      "hamstring",
      "adductor",
      "abductors",
      "knees",
      "calves",
      "gluteal",
      "left-soleus",
      "right-soleus",
    ],
  },
];

function PainScaleControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (level: number) => void;
}) {
  const severity = getPainSeverity(value);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">ระดับความปวด</span>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severity.tone}`}>
          {severity.label} · {value}/10
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-red-600"
        aria-label="ระดับความปวด 1 ถึง 10"
      />
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => {
          const isSelected = value === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              className={`flex h-11 min-w-0 items-center justify-center rounded-md border text-sm font-bold tabular-nums transition ${
                isSelected
                  ? `border-transparent text-white shadow-sm ring-2 ring-offset-1 ${severity.ring}`
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
              style={isSelected ? { backgroundColor: getPainColor(level) } : undefined}
              aria-label={`เลือกระดับความปวด ${level}`}
              aria-pressed={isSelected}
            >
              {level}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 text-[11px] font-medium text-muted-foreground">
        <span>เบา</span>
        <span className="text-center">ปานกลาง</span>
        <span className="text-right">รุนแรง</span>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
      {helper ? <p className="mt-0.5 text-[11px] text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export default function PainBodyMap() {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<BodyGroupId>("torso");
  const [selectedRegion, setSelectedRegion] = useState<PainRegion | "">("");

  const group = BODY_GROUPS.find((item) => item.id === selectedGroup) ?? BODY_GROUPS[1];
  const selectedPainPoint = selectedRegion
    ? painPoints.find((point) => point.region === selectedRegion)
    : null;

  const sortedPainPoints = useMemo(
    () => [...painPoints].sort((a, b) => b.level - a.level || a.label.localeCompare(b.label, "th")),
    [painPoints]
  );

  const painStats = useMemo(() => {
    if (painPoints.length === 0) return { max: 0, average: 0, label: "ยังไม่มีข้อมูล" };
    const max = Math.max(...painPoints.map((point) => point.level));
    const average = painPoints.reduce((total, point) => total + point.level, 0) / painPoints.length;
    return { max, average, label: getPainSeverity(max).label };
  }, [painPoints]);

  const selectOrCreateRegion = useCallback((region: PainRegion) => {
    setPainPoints((current) => {
      if (current.some((point) => point.region === region)) return current;
      return [
        ...current,
        {
          region,
          muscle: REGION_TO_MUSCLE[region],
          label: REGION_LABELS[region],
          level: 4,
        },
      ];
    });
    setSelectedRegion(region);
  }, []);

  const removeRegion = useCallback((region: PainRegion) => {
    setPainPoints((current) => current.filter((point) => point.region !== region));
    setSelectedRegion((current) => (current === region ? "" : current));
  }, []);

  const updateLevel = useCallback((region: PainRegion, level: number) => {
    setPainPoints((current) =>
      current.map((point) => (point.region === region ? { ...point, level } : point))
    );
  }, []);

  return (
    <section className="glass-card animate-fade-in p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">ดัชนีความเจ็บปวด</h2>
          <p className="mt-1 text-sm text-muted-foreground">เลือกตำแหน่งด้วยช่องเลือกขนาดใหญ่ ใช้ง่ายบนมือถือ</p>
        </div>
        {painPoints.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setPainPoints([]);
              setSelectedRegion("");
            }}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            ล้างทั้งหมด
          </button>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <SummaryMetric label="จุดที่บันทึก" value={`${painPoints.length}`} helper="ตำแหน่ง" />
        <SummaryMetric label="สูงสุด" value={painStats.max ? `${painStats.max}/10` : "-"} />
        <SummaryMetric
          label="ค่าเฉลี่ย"
          value={painStats.average ? painStats.average.toFixed(1) : "-"}
          helper={painStats.label}
        />
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">ส่วนของร่างกาย</span>
            <select
              value={selectedGroup}
              onChange={(event) => {
                setSelectedGroup(event.target.value as BodyGroupId);
                setSelectedRegion("");
              }}
              className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {BODY_GROUPS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">ระบุตำแหน่ง</span>
            <select
              value={selectedRegion}
              onChange={(event) => {
                const region = event.target.value as PainRegion;
                if (region) selectOrCreateRegion(region);
              }}
              className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">เลือกตำแหน่ง</option>
              {group.regions.map((region) => (
                <option key={region} value={region}>
                  {REGION_LABELS[region]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ตำแหน่งในกลุ่มนี้
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {group.regions.map((region) => {
              const point = painPoints.find((item) => item.region === region);
              return (
                <button
                  key={region}
                  type="button"
                  onClick={() => selectOrCreateRegion(region)}
                  className={`min-h-12 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    point
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {REGION_LABELS[region]}
                  {point ? <span className="ml-1 tabular-nums">({point.level})</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        {selectedPainPoint ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedPainPoint.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">ปรับระดับความปวดสำหรับตำแหน่งนี้</p>
              </div>
              <button
                type="button"
                onClick={() => removeRegion(selectedPainPoint.region)}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                ลบจุดนี้
              </button>
            </div>
            <PainScaleControl
              value={selectedPainPoint.level}
              onChange={(level) => updateLevel(selectedPainPoint.region, level)}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            รายการที่บันทึก
          </p>
          {painPoints.length > 0 ? (
            <span className="text-xs text-muted-foreground">เรียงจากระดับสูงสุด</span>
          ) : null}
        </div>

        {sortedPainPoints.length > 0 ? (
          <div className="space-y-2">
            {sortedPainPoints.map((point) => {
              const severity = getPainSeverity(point.level);
              const isSelected = selectedRegion === point.region;
              return (
                <div
                  key={point.region}
                  className={`rounded-lg border p-3 transition ${
                    isSelected ? "border-primary bg-primary/5" : "border-border bg-background"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRegion(point.region)}
                      className="min-w-0 text-left text-sm font-semibold text-foreground transition hover:text-primary"
                    >
                      {point.label}
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${severity.tone}`}>
                        {point.level}/10
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRegion(point.region)}
                        className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            ยังไม่มีจุดความปวดที่บันทึก
          </div>
        )}
      </div>
    </section>
  );
}
