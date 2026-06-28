import type { AlertLevel } from "@prisma/client";

export interface VitalInput {
  systolic?: number | null;
  diastolic?: number | null;
  temperature?: number | null;
  heartRate?: number | null;
  oxygenSat?: number | null;
}

export interface VitalBaseline {
  baselineSystolic?: number | null;
  baselineDiastolic?: number | null;
  baselineTemperature?: number | null;
  baselineHeartRate?: number | null;
  baselineOxygenSat?: number | null;
  baselineSystolicLower?: number | null;
  baselineSystolicUpper?: number | null;
  baselineDiastolicLower?: number | null;
  baselineDiastolicUpper?: number | null;
  baselineTemperatureLower?: number | null;
  baselineTemperatureUpper?: number | null;
  baselineHeartRateLower?: number | null;
  baselineHeartRateUpper?: number | null;
  baselineOxygenSatMin?: number | null;
  baselineOxygenSatMax?: number | null;
}

export interface VitalAlert {
  level: AlertLevel;
  title: string;
  description: string;
}

function getOxygenThresholds(baseline?: VitalBaseline | null) {
  if (baseline?.baselineOxygenSatMin != null && Number.isFinite(baseline.baselineOxygenSatMin)) {
    return {
      warningBelow: baseline.baselineOxygenSatMin,
      criticalAtOrBelow: Math.max(50, Math.min(92, baseline.baselineOxygenSatMin - 3)),
    };
  }

  const baselineOxygen = baseline?.baselineOxygenSat;

  if (baselineOxygen != null && Number.isFinite(baselineOxygen)) {
    return {
      // A single stored baseline represents this patient's usual value.
      // Treat a small drop as acceptable, while still escalating larger drops.
      warningBelow: Math.max(50, baselineOxygen - 3),
      criticalAtOrBelow: Math.max(50, Math.min(92, baselineOxygen - 4)),
    };
  }

  return {
    warningBelow: 96,
    criticalAtOrBelow: 92,
  };
}

function aboveDynamicUpper(
  value: number | null | undefined,
  upper: number | null | undefined
) {
  return value != null && upper != null && Number.isFinite(upper) && value > upper;
}

function farAboveDynamicUpper(
  value: number | null | undefined,
  upper: number | null | undefined,
  margin: number
) {
  return value != null && upper != null && Number.isFinite(upper) && value >= upper + margin;
}

function belowDynamicLower(
  value: number | null | undefined,
  lower: number | null | undefined
) {
  return value != null && lower != null && Number.isFinite(lower) && value < lower;
}

function farBelowDynamicLower(
  value: number | null | undefined,
  lower: number | null | undefined,
  margin: number
) {
  return value != null && lower != null && Number.isFinite(lower) && value <= lower - margin;
}

export function assessVitalRisk(vitals: VitalInput, baseline?: VitalBaseline | null): VitalAlert[] {
  const alerts: VitalAlert[] = [];

  if (farBelowDynamicLower(vitals.systolic, baseline?.baselineSystolicLower, 10)) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันบนต่ำ",
      description: `ความดันบน ${vitals.systolic} mmHg ต่ำกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (belowDynamicLower(vitals.systolic, baseline?.baselineSystolicLower)) {
    alerts.push({
      level: "WARNING",
      title: "ความดันบนต่ำเล็กน้อย",
      description: `ความดันบน ${vitals.systolic} mmHg ต่ำกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (farAboveDynamicUpper(vitals.systolic, baseline?.baselineSystolicUpper, 10)) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันบนสูง",
      description: `ความดันบน ${vitals.systolic} mmHg สูงกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (aboveDynamicUpper(vitals.systolic, baseline?.baselineSystolicUpper)) {
    alerts.push({
      level: "WARNING",
      title: "ความดันบนสูงเล็กน้อย",
      description: `ความดันบน ${vitals.systolic} mmHg สูงกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (baseline?.baselineSystolicUpper == null && vitals.systolic != null && vitals.systolic >= 141) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันบนสูง",
      description: `ความดันบน ${vitals.systolic} mmHg สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (baseline?.baselineSystolicUpper == null && vitals.systolic != null && vitals.systolic >= 130) {
    alerts.push({
      level: "WARNING",
      title: "ความดันบนสูงเล็กน้อย",
      description: `ความดันบน ${vitals.systolic} mmHg ควรติดตาม`,
    });
  }

  if (farBelowDynamicLower(vitals.diastolic, baseline?.baselineDiastolicLower, 6)) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันล่างต่ำ",
      description: `ความดันล่าง ${vitals.diastolic} mmHg ต่ำกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (belowDynamicLower(vitals.diastolic, baseline?.baselineDiastolicLower)) {
    alerts.push({
      level: "WARNING",
      title: "ความดันล่างต่ำเล็กน้อย",
      description: `ความดันล่าง ${vitals.diastolic} mmHg ต่ำกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (farAboveDynamicUpper(vitals.diastolic, baseline?.baselineDiastolicUpper, 6)) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันล่างสูง",
      description: `ความดันล่าง ${vitals.diastolic} mmHg สูงกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (aboveDynamicUpper(vitals.diastolic, baseline?.baselineDiastolicUpper)) {
    alerts.push({
      level: "WARNING",
      title: "ความดันล่างสูงเล็กน้อย",
      description: `ความดันล่าง ${vitals.diastolic} mmHg สูงกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (baseline?.baselineDiastolicUpper == null && vitals.diastolic != null && vitals.diastolic >= 91) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันล่างสูง",
      description: `ความดันล่าง ${vitals.diastolic} mmHg สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (baseline?.baselineDiastolicUpper == null && vitals.diastolic != null && vitals.diastolic >= 85) {
    alerts.push({
      level: "WARNING",
      title: "ความดันล่างสูงเล็กน้อย",
      description: `ความดันล่าง ${vitals.diastolic} mmHg ควรติดตาม`,
    });
  }

  if (farBelowDynamicLower(vitals.temperature, baseline?.baselineTemperatureLower, 0.6)) {
    alerts.push({
      level: "CRITICAL",
      title: "อุณหภูมิต่ำ",
      description: `อุณหภูมิ ${vitals.temperature}°C ต่ำกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (belowDynamicLower(vitals.temperature, baseline?.baselineTemperatureLower)) {
    alerts.push({
      level: "WARNING",
      title: "อุณหภูมิต่ำเล็กน้อย",
      description: `อุณหภูมิ ${vitals.temperature}°C ต่ำกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (farAboveDynamicUpper(vitals.temperature, baseline?.baselineTemperatureUpper, 0.6)) {
    alerts.push({
      level: "CRITICAL",
      title: "อุณหภูมิสูง",
      description: `อุณหภูมิ ${vitals.temperature}°C สูงกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (aboveDynamicUpper(vitals.temperature, baseline?.baselineTemperatureUpper)) {
    alerts.push({
      level: "WARNING",
      title: "อุณหภูมิสูงเล็กน้อย",
      description: `อุณหภูมิ ${vitals.temperature}°C สูงกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (baseline?.baselineTemperatureUpper == null && vitals.temperature != null && vitals.temperature >= 38.1) {
    alerts.push({
      level: "CRITICAL",
      title: "อุณหภูมิสูง",
      description: `อุณหภูมิ ${vitals.temperature}°C สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (baseline?.baselineTemperatureUpper == null && vitals.temperature != null && vitals.temperature >= 37.5) {
    alerts.push({
      level: "WARNING",
      title: "อุณหภูมิสูงเล็กน้อย",
      description: `อุณหภูมิ ${vitals.temperature}°C ควรติดตาม`,
    });
  }

  if (farBelowDynamicLower(vitals.heartRate, baseline?.baselineHeartRateLower, 12)) {
    alerts.push({
      level: "CRITICAL",
      title: "ชีพจรช้า",
      description: `ชีพจร ${vitals.heartRate} bpm ต่ำกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (belowDynamicLower(vitals.heartRate, baseline?.baselineHeartRateLower)) {
    alerts.push({
      level: "WARNING",
      title: "ชีพจรช้าเล็กน้อย",
      description: `ชีพจร ${vitals.heartRate} bpm ต่ำกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (farAboveDynamicUpper(vitals.heartRate, baseline?.baselineHeartRateUpper, 12)) {
    alerts.push({
      level: "CRITICAL",
      title: "ชีพจรเร็ว",
      description: `ชีพจร ${vitals.heartRate} bpm สูงกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (aboveDynamicUpper(vitals.heartRate, baseline?.baselineHeartRateUpper)) {
    alerts.push({
      level: "WARNING",
      title: "ชีพจรเร็วเล็กน้อย",
      description: `ชีพจร ${vitals.heartRate} bpm สูงกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (baseline?.baselineHeartRateUpper == null && vitals.heartRate != null && vitals.heartRate >= 101) {
    alerts.push({
      level: "CRITICAL",
      title: "ชีพจรเร็ว",
      description: `ชีพจร ${vitals.heartRate} bpm สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (baseline?.baselineHeartRateUpper == null && vitals.heartRate != null && vitals.heartRate >= 90) {
    alerts.push({
      level: "WARNING",
      title: "ชีพจรเร็วเล็กน้อย",
      description: `ชีพจร ${vitals.heartRate} bpm ควรติดตาม`,
    });
  }

  const oxygenThresholds = getOxygenThresholds(baseline);

  if (vitals.oxygenSat != null && vitals.oxygenSat <= oxygenThresholds.criticalAtOrBelow) {
    alerts.push({
      level: "CRITICAL",
      title: "ออกซิเจนในเลือดต่ำ",
      description: `SpO2 ${vitals.oxygenSat}% ต่ำกว่าเกณฑ์เฉพาะบุคคล`,
    });
  } else if (vitals.oxygenSat != null && vitals.oxygenSat < oxygenThresholds.warningBelow) {
    alerts.push({
      level: "WARNING",
      title: "ออกซิเจนในเลือดต่ำเล็กน้อย",
      description: `SpO2 ${vitals.oxygenSat}% ต่ำกว่าค่าปกติเฉพาะบุคคล ควรติดตาม`,
    });
  }

  return alerts;
}

export function getPatientStatus(
  vitals: VitalInput | null,
  baseline?: VitalBaseline | null
): "stable" | "monitoring" | "critical" {
  if (!vitals) return "stable";
  const alerts = assessVitalRisk(vitals, baseline);
  if (alerts.some((a) => a.level === "CRITICAL")) return "critical";
  if (alerts.some((a) => a.level === "WARNING")) return "monitoring";
  return "stable";
}

export type MetricStatus = "ok" | "warning" | "critical";

export function getVitalMetricStatus(
  field: keyof VitalInput,
  value: number | null | undefined,
  baseline?: VitalBaseline | null
): MetricStatus {
  if (value == null) return "ok";
  const partial: VitalInput = { [field]: value };
  const alerts = assessVitalRisk(partial, baseline);
  if (alerts.some((a) => a.level === "CRITICAL")) return "critical";
  if (alerts.some((a) => a.level === "WARNING")) return "warning";
  return "ok";
}

export function getBloodPressureStatus(
  systolic: number | null | undefined,
  diastolic: number | null | undefined,
  baseline?: VitalBaseline | null
): MetricStatus {
  const sys = getVitalMetricStatus("systolic", systolic, baseline);
  const dia = getVitalMetricStatus("diastolic", diastolic, baseline);
  if (sys === "critical" || dia === "critical") return "critical";
  if (sys === "warning" || dia === "warning") return "warning";
  return "ok";
}
