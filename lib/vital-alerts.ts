import type { AlertLevel } from "@prisma/client";

export interface VitalInput {
  systolic?: number | null;
  diastolic?: number | null;
  temperature?: number | null;
  heartRate?: number | null;
  oxygenSat?: number | null;
}

export interface VitalAlert {
  level: AlertLevel;
  title: string;
  description: string;
}

export function assessVitalRisk(vitals: VitalInput): VitalAlert[] {
  const alerts: VitalAlert[] = [];

  if (vitals.systolic != null && vitals.systolic >= 141) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันบนสูง",
      description: `ความดันบน ${vitals.systolic} mmHg สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (vitals.systolic != null && vitals.systolic >= 130) {
    alerts.push({
      level: "WARNING",
      title: "ความดันบนสูงเล็กน้อย",
      description: `ความดันบน ${vitals.systolic} mmHg ควรติดตาม`,
    });
  }

  if (vitals.diastolic != null && vitals.diastolic >= 91) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันล่างสูง",
      description: `ความดันล่าง ${vitals.diastolic} mmHg สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (vitals.diastolic != null && vitals.diastolic >= 85) {
    alerts.push({
      level: "WARNING",
      title: "ความดันล่างสูงเล็กน้อย",
      description: `ความดันล่าง ${vitals.diastolic} mmHg ควรติดตาม`,
    });
  }

  if (vitals.temperature != null && vitals.temperature >= 38.1) {
    alerts.push({
      level: "CRITICAL",
      title: "อุณหภูมิสูง",
      description: `อุณหภูมิ ${vitals.temperature}°C สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (vitals.temperature != null && vitals.temperature >= 37.5) {
    alerts.push({
      level: "WARNING",
      title: "อุณหภูมิสูงเล็กน้อย",
      description: `อุณหภูมิ ${vitals.temperature}°C ควรติดตาม`,
    });
  }

  if (vitals.heartRate != null && vitals.heartRate >= 101) {
    alerts.push({
      level: "CRITICAL",
      title: "ชีพจรเร็ว",
      description: `ชีพจร ${vitals.heartRate} bpm สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (vitals.heartRate != null && vitals.heartRate >= 90) {
    alerts.push({
      level: "WARNING",
      title: "ชีพจรเร็วเล็กน้อย",
      description: `ชีพจร ${vitals.heartRate} bpm ควรติดตาม`,
    });
  }

  if (vitals.oxygenSat != null && vitals.oxygenSat <= 92) {
    alerts.push({
      level: "CRITICAL",
      title: "ออกซิเจนในเลือดต่ำ",
      description: `SpO2 ${vitals.oxygenSat}% ต่ำกว่าเกณฑ์ปกติ`,
    });
  } else if (vitals.oxygenSat != null && vitals.oxygenSat <= 95) {
    alerts.push({
      level: "WARNING",
      title: "ออกซิเจนในเลือดต่ำเล็กน้อย",
      description: `SpO2 ${vitals.oxygenSat}% ควรติดตาม`,
    });
  }

  return alerts;
}

export function getPatientStatus(vitals: VitalInput | null): "stable" | "monitoring" | "critical" {
  if (!vitals) return "stable";
  const alerts = assessVitalRisk(vitals);
  if (alerts.some((a) => a.level === "CRITICAL")) return "critical";
  if (alerts.some((a) => a.level === "WARNING")) return "monitoring";
  return "stable";
}

export type MetricStatus = "ok" | "warning" | "critical";

export function getVitalMetricStatus(
  field: keyof VitalInput,
  value: number | null | undefined
): MetricStatus {
  if (value == null) return "ok";
  const partial: VitalInput = { [field]: value };
  const alerts = assessVitalRisk(partial);
  if (alerts.some((a) => a.level === "CRITICAL")) return "critical";
  if (alerts.some((a) => a.level === "WARNING")) return "warning";
  return "ok";
}

export function getBloodPressureStatus(
  systolic: number | null | undefined,
  diastolic: number | null | undefined
): MetricStatus {
  const sys = getVitalMetricStatus("systolic", systolic);
  const dia = getVitalMetricStatus("diastolic", diastolic);
  if (sys === "critical" || dia === "critical") return "critical";
  if (sys === "warning" || dia === "warning") return "warning";
  return "ok";
}
