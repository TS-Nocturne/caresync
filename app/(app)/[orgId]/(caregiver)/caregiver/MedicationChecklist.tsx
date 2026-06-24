"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTheme, subscribeTheme } from "@/lib/theme";

function getSignatureInkColor() {
  return getTheme() === "dark" ? "#ffffff" : "#0f172a";
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  scheduleTime: string;
  status: "PENDING" | "GIVEN" | "SKIPPED";
  signatureUrl?: string | null;
}

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
}: {
  orgId: string;
  patientId: string | null;
  onMedsChange?: (meds: Medication[]) => void;
}) {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!patientId) {
      const timeoutId = window.setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
      };
    }

    async function loadMeds() {
      try {
        setError("");
        const res = await fetch(`/api/medications?orgId=${orgId}&patientId=${patientId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "โหลดรายการยาไม่สำเร็จ");
        const loaded = json.data ?? [];
        if (cancelled) return;
        setMeds(loaded);
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

  const updateMed = async (id: string, status: "GIVEN" | "SKIPPED", signatureUrl?: string) => {
    const res = await fetch("/api/medications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, medicationId: id, status, signatureUrl }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "บันทึกยาไม่สำเร็จ");
    setMeds((current) => {
      const next = current.map((m) => (m.id === id ? json.data : m));
      onMedsChange?.(next);
      return next;
    });
  };

  const confirmGive = async (id: string, sigData: string) => {
    try {
      await updateMed(id, "GIVEN", sigData);
      setSigningId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกยาไม่สำเร็จ");
    }
  };

  const skipMed = async (id: string) => {
    try {
      await updateMed(id, "SKIPPED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกยาไม่สำเร็จ");
    }
  };

  const givenCount = meds.filter((m) => m.status === "GIVEN").length;
  const pendingCount = meds.filter((m) => m.status === "PENDING").length;

  return (
    <div className="glass-card p-5 animate-fade-in border-2 border-primary/10">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">💊</span>
        <h2 className="text-lg font-semibold">Medication Checklist & ลายเซ็นดิจิทัล</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        ติ๊กจ่ายยาและเซ็นชื่อก่อนกดบันทึกข้อมูลทั้งหมด — หลักฐานสำหรับการเบิกจ่ายและทางกฎหมาย
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-600 text-sm border border-rose-100">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">กำลังโหลดรายการยา...</p>
      ) : !patientId ? (
        <p className="text-sm text-muted-foreground py-6 text-center">ไม่พบผู้ป่วย</p>
      ) : meds.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">ไม่มีรายการยาวันนี้</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3 text-xs font-medium">
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

          <div className="space-y-3">
            {meds.map((med) => {
              const cfg = statusConfig[med.status];
              return (
                <div key={med.id}>
                  <div className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg} transition-all`}>
                    <div className="flex items-start gap-3">
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
                          <span className="font-semibold text-sm">{med.name}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {med.dosage} — เวลา {med.scheduleTime} น.
                        </p>
                        {med.signatureUrl && med.status === "GIVEN" && (
                          <p className="text-[10px] text-emerald-600 mt-1">✍️ มีลายเซ็นดิจิทัลแล้ว</p>
                        )}
                      </div>
                      {med.status === "PENDING" && (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSigningId(med.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark transition-all"
                          >
                            ให้ยา + เซ็น
                          </button>
                          <button
                            type="button"
                            onClick={() => skipMed(med.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                          >
                            ข้าม
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
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
