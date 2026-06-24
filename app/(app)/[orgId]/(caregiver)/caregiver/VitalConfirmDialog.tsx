"use client";

import type { ValidationIssue } from "@/lib/vital-validation";

export default function VitalConfirmDialog({
  issues,
  onConfirm,
  onCancel,
  onApplySuggestion,
}: {
  issues: ValidationIssue[];
  onConfirm: () => void;
  onCancel: () => void;
  onApplySuggestion?: (field: string, value: number) => void;
}) {
  const hasError = issues.some((i) => i.severity === "error");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-lg">
            ⚠️
          </span>
          <div>
            <h3 className="text-lg font-semibold">ตรวจพบตัวเลขที่อาจผิดปกติ</h3>
            <p className="text-sm text-muted-foreground mt-1">
              ระบบ Sanity Check ตรวจพบค่าที่อาจเป็นความผิดพลาดจากการพิมพ์ กรุณายืนยันก่อนบันทึกและส่งต่อข้อมูลเฝ้าระวัง
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {issues.map((issue, idx) => (
            <li
              key={`${issue.field}-${idx}`}
              className={`p-3 rounded-xl text-sm border ${
                issue.severity === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <p>{issue.message}</p>
              {issue.suggested_value != null && onApplySuggestion && (
                <button
                  type="button"
                  onClick={() => onApplySuggestion(issue.field, issue.suggested_value!)}
                  className="mt-2 text-xs font-medium underline hover:no-underline"
                >
                  ใช้ค่าที่แนะนำ: {issue.suggested_value}
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
          >
            แก้ไขตัวเลข
          </button>
          {!hasError && (
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark text-sm font-medium transition-colors"
            >
              ยืนยัน — ตัวเลขถูกต้อง
            </button>
          )}
        </div>

        {hasError && (
          <p className="text-xs text-rose-600 text-center">
            ค่าที่อยู่นอกช่วงที่เป็นไปได้ต้องแก้ไขก่อนบันทึก
          </p>
        )}
      </div>
    </div>
  );
}
