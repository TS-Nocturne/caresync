/**
 * Client-side vital sign validation — mirrors the backend logic in
 * patient_care_backend/services/vital_validation.py to provide instant
 * feedback before form submission.  Keep both versions in sync.
 */
export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  field: string;
  value: number | null;
  severity: ValidationSeverity;
  message: string;
  suggested_value?: number | null;
}

const HARD_LIMITS: Record<string, [number, number]> = {
  systolic: [40, 300],
  diastolic: [20, 200],
  temperature_c: [30, 45],
  heart_rate: [20, 250],
  spo2: [50, 100],
};

const SOFT_LIMITS: Record<string, [number, number]> = {
  systolic: [70, 220],
  diastolic: [40, 130],
  temperature_c: [34, 42],
  heart_rate: [40, 180],
  spo2: [85, 100],
};

function getFloat(vitals: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const raw = vitals[key];
    if (raw !== undefined && raw !== null && raw !== "") {
      const n = Number(raw);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

export function validateVitals(vitals: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const systolic = getFloat(vitals, "systolic");
  const diastolic = getFloat(vitals, "diastolic");
  const temperature = getFloat(vitals, "temperature_c", "temperature");
  const heartRate = getFloat(vitals, "heart_rate", "heartRate");
  const spo2 = getFloat(vitals, "spo2", "oxygenSat");

  const fields: Array<[string, number | null]> = [
    ["systolic", systolic],
    ["diastolic", diastolic],
    ["temperature_c", temperature],
    ["heart_rate", heartRate],
    ["spo2", spo2],
  ];

  for (const [field, value] of fields) {
    if (value === null) continue;

    if (field === "systolic" && value >= 10 && value <= 19) {
      issues.push({
        field,
        value,
        severity: "warning",
        message: "อาจพิมพ์ตก 0 — ตั้งใจ 120 แต่ได้ 12?",
        suggested_value: value * 10,
      });
      continue;
    }
    if (field === "diastolic" && value >= 5 && value <= 9) {
      issues.push({
        field,
        value,
        severity: "warning",
        message: "อาจพิมพ์ตก 0 — ตั้งใจ 80 แต่ได้ 8?",
        suggested_value: value * 10,
      });
      continue;
    }
    if (field === "temperature_c" && value >= 100) {
      issues.push({
        field,
        value,
        severity: "warning",
        message: "อาจพิมพ์ผิด — ตั้งใจ 37.5 แต่ได้ 375?",
        suggested_value: Math.round((value / 10) * 10) / 10,
      });
      continue;
    }

    const hard = HARD_LIMITS[field];
    if (hard && (value < hard[0] || value > hard[1])) {
      issues.push({
        field,
        value,
        severity: "error",
        message: `${field}=${value} อยู่นอกช่วงที่เป็นไปได้ของร่างกายมนุษย์ (${hard[0]}–${hard[1]})`,
      });
      continue;
    }

    const soft = SOFT_LIMITS[field];
    if (soft && (value < soft[0] || value > soft[1])) {
      const message = `${field}=${value} ดูผิดปกติ — กรุณายืนยันตัวเลขอีกครั้ง`;

      issues.push({ field, value, severity: "warning", message });
    }
  }

  if (systolic !== null && diastolic !== null && systolic <= diastolic) {
    issues.push({
      field: "blood_pressure",
      value: null,
      severity: "warning",
      message: `ความดันบน (${systolic}) ต้องมากกว่าความดันล่าง (${diastolic}) — กรุณาตรวจสอบ`,
    });
  }

  return issues;
}

export function validationNeedsConfirmation(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error" || i.severity === "warning");
}
