"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTheme, subscribeTheme } from "@/lib/theme";

function getSignatureInkColor() {
  return getTheme() === "dark" ? "#ffffff" : "#0f172a";
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface Medication {
  id: string;
  name: string;
  strength?: string | null;
  doseAmount?: number | null;
  doseUnit?: string | null;
  dosage: string;
  scheduleTime: string;
  isPrn?: boolean;
  indication?: string | null;
  appearance?: string | null;
  status: "PENDING" | "GIVEN" | "SKIPPED";
  signatureUrl?: string | null;
  selfAdministered?: boolean;
  skipReason?: "FAMILY_GIVEN" | "PATIENT_SELF_ADMINISTERED" | "OTHER" | null;
  handledByName?: string | null;
  handledByRole?: "FAMILY" | "CAREGIVER" | "PATIENT" | string | null;
}

interface MedicationWindow {
  id: string;
  label: string;
  start: string;
  end: string;
}

type EvidenceSkipReason = "FAMILY_GIVEN" | "PATIENT_SELF_ADMINISTERED";

const statusConfig = {
  PENDING: {
    label: "รอให้ยา",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-600",
    border: "border-amber-200 dark:border-amber-800",
  },
  GIVEN: {
    label: "ให้แล้ว ✓ มีลายเซ็น",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-600",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  SKIPPED: {
    label: "ข้าม",
    bg: "bg-red-50 dark:bg-red-950/20",
    text: "text-red-600",
    border: "border-red-200 dark:border-red-800",
  },
};

function SignatureCanvas({
  onSave,
  onCancel,
}: {
  onSave: (data: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const inkColorRef = useRef(getSignatureInkColor());

  useEffect(() => {
    inkColorRef.current = getSignatureInkColor();
    return subscribeTheme(() => {
      inkColorRef.current = getSignatureInkColor();
    });
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = inkColorRef.current;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, []);

  const stopDraw = () => {
    isDrawingRef.current = false;
  };

  const clear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-lg">✍️</span>
        <p className="text-sm font-medium">ลายเซ็นดิจิทัล — หลักฐานการให้ยา</p>
      </div>
      <p className="text-xs text-muted-foreground">
        กรุณาเซ็นชื่อในกรอบด้านล่างเพื่อยืนยันการจ่ายยา (ใช้นิ้วบนแท็บเล็ตได้)
      </p>
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="signature-canvas w-full h-[120px] rounded-xl border-2 border-dashed border-primary/40 bg-card touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
        >
          ล้าง
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={() => onSave(canvasRef.current?.toDataURL() || "")}
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark transition-colors font-medium"
        >
          ยืนยัน + บันทึก
        </button>
      </div>
    </div>
  );
}

export default function MedicationChecklist({
  orgId,
  patientId,
  onMedsChange,
  mode = "caregiver",
  onAfterChange,
}: {
  orgId: string;
  patientId: string | null;
  onMedsChange?: (meds: Medication[]) => void;
  mode?: "caregiver" | "family";
  onAfterChange?: () => void;
}) {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [prnMeds, setPrnMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [skippingId, setSkippingId] = useState<string | null>(null);
  const [pendingEvidenceSkip, setPendingEvidenceSkip] = useState<{
    id: string;
    reason: EvidenceSkipReason;
  } | null>(null);
  const [error, setError] = useState("");
  const [windowInfo, setWindowInfo] = useState<MedicationWindow | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!patientId) {
      const timeoutId = window.setTimeout(() => {
        if (!cancelled) {
          setMeds([]);
          setPrnMeds([]);
          setWindowInfo(null);
          onMedsChange?.([]);
          setLoading(false);
        }
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
      };
    }

    const activePatientId = patientId;

    async function loadMeds() {
      try {
        setLoading(true);
        setError("");
        const currentDate = new Date();
        const now = currentDate.toTimeString().slice(0, 5);
        const today = formatLocalDate(currentDate);
        const params = new URLSearchParams({ orgId, patientId: activePatientId, now, today });
        const res = await fetch(`/api/medications?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "โหลดรายการยาไม่สำเร็จ");
        const loaded = json.data ?? [];
        const loadedPrn = json.prnData ?? [];
        if (cancelled) return;
        setMeds(loaded);
        setPrnMeds(loadedPrn);
        setWindowInfo(json.window ?? null);
        onMedsChange?.(loaded);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "โหลดรายการยาไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadMeds();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [orgId, patientId, onMedsChange]);

  const updateMed = async (
    id: string,
    status: "GIVEN" | "SKIPPED",
    signatureUrl?: string,
    skipReason?: Medication["skipReason"],
    evidenceVerified = false
  ) => {
    const res = await fetch("/api/medications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, medicationId: id, status, signatureUrl, skipReason, evidenceVerified }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "บันทึกยาไม่สำเร็จ");
    setMeds((current) => {
      const next = current.map((m) => (m.id === id ? json.data : m));
      onMedsChange?.(next);
      return next;
    });
    setPrnMeds((current) => current.map((m) => (m.id === id ? json.data : m)));
    onAfterChange?.();
  };

  const confirmGive = async (id: string, sigData: string) => {
    try {
      await updateMed(id, "GIVEN", sigData);
      setSigningId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกยาไม่สำเร็จ");
    }
  };

  const giveWithoutSignature = async (id: string) => {
    try {
      await updateMed(id, "GIVEN");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save medication failed");
    }
  };

  const skipMed = async (id: string, reason: Medication["skipReason"] = "OTHER") => {
    try {
      const evidenceVerified = reason === "FAMILY_GIVEN" || reason === "PATIENT_SELF_ADMINISTERED";
      await updateMed(id, "SKIPPED", undefined, reason, evidenceVerified);
      setSkippingId(null);
      setPendingEvidenceSkip(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกยาไม่สำเร็จ");
    }
  };

  const requestEvidenceSkip = (id: string, reason: EvidenceSkipReason) => {
    setPendingEvidenceSkip({ id, reason });
  };

  const requiredMeds = meds.filter((m) => !m.selfAdministered);
  const givenCount = requiredMeds.filter((m) => m.status !== "PENDING").length;
  const pendingCount = requiredMeds.filter((m) => m.status === "PENDING").length;
  const medicationDoseText = (med: Medication) =>
    med.doseAmount != null && med.doseUnit ? `${med.doseAmount} ${med.doseUnit}` : med.dosage;
  const title =
    mode === "family"
      ? "บันทึกการให้ยาประจำวัน"
      : "Medication Checklist & ลายเซ็นดิจิทัล";
  const description =
    mode === "family"
      ? "เพื่อการดูแลที่ต่อเนื่องและปลอดภัย"
      : "ติ๊กจ่ายยาและเซ็นชื่อก่อนกดบันทึกข้อมูลทั้งหมด — หลักฐานสำหรับการเบิกจ่ายและทางกฎหมาย";

  return (
    <div className="glass-card p-5 animate-fade-in border-2 border-primary/10">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xl leading-none">💊</span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        {description}
      </p>
      {windowInfo && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          แสดงเฉพาะยา{windowInfo.label} ({windowInfo.start}-{windowInfo.end} น.)
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-600 text-sm border border-rose-100">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">กำลังโหลดรายการยา...</p>
      ) : !patientId ? (
        <p className="text-sm text-muted-foreground py-6 text-center">ไม่พบผู้สูงอายุ</p>
      ) : meds.length === 0 && prnMeds.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {windowInfo
            ? `ไม่มีรายการยา${windowInfo.label} (${windowInfo.start}-${windowInfo.end} น.)`
            : "ไม่มีรายการยาในรอบนี้"}
        </p>
      ) : (
        <>
          {meds.length > 0 && (
            <>
              <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between mb-3 text-xs font-medium">
                <span className="text-muted-foreground">
                  ให้แล้ว {givenCount}/{meds.length}
                </span>
                {pendingCount > 0 && (
                  <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    รอให้ยา {pendingCount} รายการ
                  </span>
                )}
              </div>

              <div className="w-full h-2 rounded-full bg-muted mb-5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${meds.length ? (givenCount / meds.length) * 100 : 0}%` }}
                />
              </div>
            </>
          )}

          {meds.length === 0 && (
            <p className="mb-4 text-sm text-muted-foreground text-center">
              ไม่มีรายการยาประจำในรอบนี้
            </p>
          )}

          {meds.length > 0 && (
            <div className="space-y-3">
              {meds.map((med) => {
                const cfg = statusConfig[med.status];
                return (
                  <div key={med.id}>
                    <div className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg} transition-all`}>
                      <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-start">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 mt-0.5 ${
                            med.status === "GIVEN"
                              ? "bg-emerald-100 text-emerald-600"
                              : med.status === "SKIPPED"
                                ? "bg-red-100 text-red-600"
                                : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          {med.status === "GIVEN" ? "✓" : med.status === "SKIPPED" ? "✕" : "○"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">
                              {med.name}
                              {med.strength ? ` ${med.strength}` : ""}
                            </span>
                            {!med.strength && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                ไม่ระบุขนาดยา
                              </span>
                            )}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ปริมาณ {medicationDoseText(med)} — เวลา {med.scheduleTime} น.
                          </p>
                          {med.indication && (
                            <p className="text-[11px] text-muted-foreground mt-1">สรรพคุณ: {med.indication}</p>
                          )}
                          {med.appearance && (
                            <p className="text-[11px] text-muted-foreground mt-1">ลักษณะยา: {med.appearance}</p>
                          )}
                          {med.signatureUrl && med.status === "GIVEN" && (
                            <p className="text-[10px] text-emerald-600 mt-1">✍️ มีลายเซ็นดิจิทัลแล้ว</p>
                          )}
                        </div>
                        {med.status === "PENDING" && (
                          <div className="grid w-full grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 min-[520px]:w-auto min-[520px]:shrink-0">
                            <button
                              type="button"
                              onClick={() => mode === "family" ? giveWithoutSignature(med.id) : setSigningId(med.id)}
                              className="min-h-9 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark transition-all"
                            >
                              {mode === "family" ? "บันทึกว่าให้ยาแล้ว" : "ให้ยา + เซ็น"}
                            </button>
                            <button
                              type="button"
                              onClick={() => mode === "family" ? requestEvidenceSkip(med.id, "PATIENT_SELF_ADMINISTERED") : setSkippingId(med.id)}
                              className="min-h-9 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                            >
                              {mode === "family" ? "ผู้สูงอายุทานเองแล้ว" : "ข้าม"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {signingId === med.id && (
                      <div className="mt-2 p-4 rounded-xl border-2 border-primary/30 bg-card shadow-inner">
                        <SignatureCanvas
                          onSave={(data) => confirmGive(med.id, data)}
                          onCancel={() => setSigningId(null)}
                        />
                      </div>
                    )}
                    {skippingId === med.id && (
                      <div className="mt-2 rounded-xl border border-border bg-card p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">เลือกเหตุผลการข้าม</p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => requestEvidenceSkip(med.id, "FAMILY_GIVEN")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                            ญาติให้ยาแล้ว
                          </button>
                          <button type="button" onClick={() => requestEvidenceSkip(med.id, "PATIENT_SELF_ADMINISTERED")} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white">
                            ผู้สูงอายุทานเองแล้ว
                          </button>
                          <button type="button" onClick={() => skipMed(med.id, "OTHER")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium">
                            ข้ามอื่นๆ
                          </button>
                          <button type="button" onClick={() => setSkippingId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium">
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {prnMeds.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="mb-3 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                <h3 className="text-sm font-semibold">ยาตามอาการ (PRN)</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  ไม่บังคับจบกะ
                </span>
              </div>
              <div className="space-y-3">
                {prnMeds.map((med) => {
                  const cfg = statusConfig[med.status];
                  return (
                    <div key={med.id} className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                      <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">
                              {med.name}
                              {med.strength ? ` ${med.strength}` : ""}
                            </span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                              PRN
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ปริมาณ {medicationDoseText(med)}
                          </p>
                          {med.indication && (
                            <p className="text-[11px] text-muted-foreground mt-1">สรรพคุณ: {med.indication}</p>
                          )}
                          {med.appearance && (
                            <p className="text-[11px] text-muted-foreground mt-1">ลักษณะยา: {med.appearance}</p>
                          )}
                        </div>
                        {med.status === "PENDING" && (
                          <div className="grid w-full grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 min-[520px]:w-auto min-[520px]:shrink-0">
                            <button
                              type="button"
                              onClick={() => mode === "family" ? giveWithoutSignature(med.id) : setSigningId(med.id)}
                              className="min-h-9 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark transition-all"
                            >
                              {mode === "family" ? "บันทึกว่าให้ยาแล้ว" : "ให้ยา + เซ็น"}
                            </button>
                            <button
                              type="button"
                              onClick={() => mode === "family" ? requestEvidenceSkip(med.id, "PATIENT_SELF_ADMINISTERED") : setSkippingId(med.id)}
                              className="min-h-9 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                            >
                              {mode === "family" ? "ผู้สูงอายุทานเองแล้ว" : "ข้าม"}
                            </button>
                          </div>
                        )}
                      </div>
                      {signingId === med.id && (
                        <div className="mt-2 p-4 rounded-xl border-2 border-primary/30 bg-card shadow-inner">
                          <SignatureCanvas
                            onSave={(data) => confirmGive(med.id, data)}
                            onCancel={() => setSigningId(null)}
                          />
                        </div>
                      )}
                      {skippingId === med.id && (
                        <div className="mt-2 rounded-xl border border-border bg-card p-3">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">เลือกเหตุผลการข้าม</p>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => requestEvidenceSkip(med.id, "FAMILY_GIVEN")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                              ญาติให้ยาแล้ว
                            </button>
                            <button type="button" onClick={() => requestEvidenceSkip(med.id, "PATIENT_SELF_ADMINISTERED")} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white">
                              ผู้สูงอายุทานเองแล้ว
                            </button>
                            <button type="button" onClick={() => skipMed(med.id, "OTHER")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium">
                              ข้ามอื่นๆ
                            </button>
                            <button type="button" onClick={() => setSkippingId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium">
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      {pendingEvidenceSkip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 px-4 py-6">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <h3 className="text-base font-semibold">โปรดตรวจสอบหลักฐาน</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              เพื่อความปลอดภัย กรุณาตรวจสอบซองยา หรือตลับยาประจำวัน ให้แน่ใจว่ายาหายไปแล้วจริง
              ก่อนกดยืนยันว่าผู้สูงอายุทานเองแล้วหรือมีคนในครอบครัวจัดการให้แล้ว
            </p>
            <div className="mt-5 grid gap-2 min-[420px]:grid-cols-2">
              <button
                type="button"
                onClick={() => setPendingEvidenceSkip(null)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => skipMed(pendingEvidenceSkip.id, pendingEvidenceSkip.reason)}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
              >
                ยืนยัน ยาถูกทานแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
