"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { IExerciseData, IMuscleStats, Muscle } from "react-body-highlighter";
import {
  ANTERIOR_MUSCLES,
  getPainColor,
  getPainSeverity,
  PAIN_HIGHLIGHT_COLORS,
  POSTERIOR_MUSCLES,
  REGION_LABELS,
  REGION_TO_MUSCLE,
  type PainPoint,
  type PainRegion,
} from "./pain-body-config";

const BodyModel = dynamic(() => import("react-body-highlighter"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
      กำลังโหลดแผนที่ร่างกาย...
    </div>
  ),
});

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
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => {
          const isSelected = value === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              className={`flex h-9 min-w-0 items-center justify-center rounded-md border text-xs font-bold tabular-nums transition ${
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
  const [selectedRegion, setSelectedRegion] = useState<PainRegion | null>(null);
  const [view, setView] = useState<"anterior" | "posterior">("anterior");

  const selectedPainPoint = painPoints.find((point) => point.region === selectedRegion);
  const quickRegions = view === "anterior" ? ANTERIOR_MUSCLES : POSTERIOR_MUSCLES;

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

  const modelData: IExerciseData[] = useMemo(() => {
    const levelsByMuscle = new Map<Muscle, number>();
    painPoints.forEach((point) => {
      levelsByMuscle.set(point.muscle, Math.max(levelsByMuscle.get(point.muscle) ?? 0, point.level));
    });

    return Array.from(levelsByMuscle.entries()).map(([muscle, level]) => ({
      name: `${level}`,
      muscles: [muscle],
      frequency: level,
    }));
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
    setSelectedRegion((current) => (current === region ? null : current));
  }, []);

  const updateLevel = useCallback((region: PainRegion, level: number) => {
    setPainPoints((current) =>
      current.map((point) => (point.region === region ? { ...point, level } : point))
    );
  }, []);

  const handleMuscleClick = useCallback(
    ({ muscle }: IMuscleStats) => {
      selectOrCreateRegion(muscle);
    },
    [selectOrCreateRegion]
  );

  return (
    <section className="glass-card animate-fade-in p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">ดัชนีความเจ็บปวด</h2>
          <p className="mt-1 text-sm text-muted-foreground">แผนที่ร่างกายและระดับความปวด 1-10</p>
        </div>
        {painPoints.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setPainPoints([]);
              setSelectedRegion(null);
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

      <div className="mb-4 grid grid-cols-2 rounded-lg border border-border bg-muted p-1">
        {(["anterior", "posterior"] as const).map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => setView(side)}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              view === side
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={view === side}
          >
            {side === "anterior" ? "ด้านหน้า" : "ด้านหลัง"}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mx-auto max-w-[18rem] [&_.rbh-wrapper]:mx-auto [&_.rbh]:cursor-pointer">
            <BodyModel
              data={modelData}
              type={view}
              bodyColor="#d4d4d8"
              highlightedColors={PAIN_HIGHLIGHT_COLORS}
              onClick={handleMuscleClick}
              style={{ width: "100%", maxWidth: "18rem", margin: "0 auto", padding: "0.5rem" }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ตำแหน่งที่พบบ่อย
            </p>
            <div className="flex flex-wrap gap-2">
              {quickRegions.map((region) => {
                const point = painPoints.find((item) => item.region === region);
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => selectOrCreateRegion(region)}
                    className={`min-h-9 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    ปรับระดับแล้วสีบนแผนที่จะเปลี่ยนตามความรุนแรง
                  </p>
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
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              เลือกตำแหน่งบนแผนที่หรือปุ่มตำแหน่งเพื่อเริ่มบันทึก
            </div>
          )}
        </div>
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
