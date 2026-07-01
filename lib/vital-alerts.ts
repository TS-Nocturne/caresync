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

function highestAlertLevel(alerts: VitalAlert[]): AlertLevel {
  if (alerts.some((alert) => alert.level === "CRITICAL")) return "CRITICAL";
  if (alerts.some((alert) => alert.level === "WARNING")) return "WARNING";
  return "INFO";
}

export function summarizeVitalAlerts(alerts: VitalAlert[]): VitalAlert | null {
  if (alerts.length === 0) return null;
  if (alerts.length === 1) return alerts[0];

  const titles = alerts.map((alert) => alert.title);
  return {
    level: highestAlertLevel(alerts),
    title: `ตรวจพบค่าสถิติร่างกายผิดปกติ ${alerts.length} รายการ`,
    description: `${titles.join(", ")} — ${alerts.map((alert) => alert.description).join("; ")}`,
  };
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

function finiteNumber(value: number | null | undefined) {
  return value != null && Number.isFinite(value) ? value : null;
}

function dynamicRange({
  lower,
  upper,
  baseline,
  tolerance,
}: {
  lower: number | null | undefined;
  upper: number | null | undefined;
  baseline: number | null | undefined;
  tolerance: number;
}) {
  const explicitLower = finiteNumber(lower);
  const explicitUpper = finiteNumber(upper);
  const singleBaseline = finiteNumber(baseline);

  return {
    lower: explicitLower ?? (singleBaseline != null ? singleBaseline - tolerance : null),
    upper: explicitUpper ?? (singleBaseline != null ? singleBaseline + tolerance : null),
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
  const systolicRange = dynamicRange({
    lower: baseline?.baselineSystolicLower,
    upper: baseline?.baselineSystolicUpper,
    baseline: baseline?.baselineSystolic,
    tolerance: 10,
  });
  const diastolicRange = dynamicRange({
    lower: baseline?.baselineDiastolicLower,
    upper: baseline?.baselineDiastolicUpper,
    baseline: baseline?.baselineDiastolic,
    tolerance: 6,
  });
  const temperatureRange = dynamicRange({
    lower: baseline?.baselineTemperatureLower,
    upper: baseline?.baselineTemperatureUpper,
    baseline: baseline?.baselineTemperature,
    tolerance: 0.4,
  });
  const heartRateRange = dynamicRange({
    lower: baseline?.baselineHeartRateLower,
    upper: baseline?.baselineHeartRateUpper,
    baseline: baseline?.baselineHeartRate,
    tolerance: 12,
  });

  if (farBelowDynamicLower(vitals.systolic, systolicRange.lower, 10)) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันบนต่ำ",
      description: `ความดันบน ${vitals.systolic} mmHg ต่ำกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (belowDynamicLower(vitals.systolic, systolicRange.lower)) {
    alerts.push({
      level: "WARNING",
      title: "ความดันบนต่ำเล็กน้อย",
      description: `ความดันบน ${vitals.systolic} mmHg ต่ำกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (farAboveDynamicUpper(vitals.systolic, systolicRange.upper, 10)) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันบนสูง",
      description: `ความดันบน ${vitals.systolic} mmHg สูงกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (aboveDynamicUpper(vitals.systolic, systolicRange.upper)) {
    alerts.push({
      level: "WARNING",
      title: "ความดันบนสูงเล็กน้อย",
      description: `ความดันบน ${vitals.systolic} mmHg สูงกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (systolicRange.upper == null && vitals.systolic != null && vitals.systolic >= 141) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันบนสูง",
      description: `ความดันบน ${vitals.systolic} mmHg สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (systolicRange.upper == null && vitals.systolic != null && vitals.systolic >= 130) {
    alerts.push({
      level: "WARNING",
      title: "ความดันบนสูงเล็กน้อย",
      description: `ความดันบน ${vitals.systolic} mmHg ควรติดตาม`,
    });
  }

  if (farBelowDynamicLower(vitals.diastolic, diastolicRange.lower, 6)) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันล่างต่ำ",
      description: `ความดันล่าง ${vitals.diastolic} mmHg ต่ำกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (belowDynamicLower(vitals.diastolic, diastolicRange.lower)) {
    alerts.push({
      level: "WARNING",
      title: "ความดันล่างต่ำเล็กน้อย",
      description: `ความดันล่าง ${vitals.diastolic} mmHg ต่ำกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (farAboveDynamicUpper(vitals.diastolic, diastolicRange.upper, 6)) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันล่างสูง",
      description: `ความดันล่าง ${vitals.diastolic} mmHg สูงกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (aboveDynamicUpper(vitals.diastolic, diastolicRange.upper)) {
    alerts.push({
      level: "WARNING",
      title: "ความดันล่างสูงเล็กน้อย",
      description: `ความดันล่าง ${vitals.diastolic} mmHg สูงกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (diastolicRange.upper == null && vitals.diastolic != null && vitals.diastolic >= 91) {
    alerts.push({
      level: "CRITICAL",
      title: "ความดันล่างสูง",
      description: `ความดันล่าง ${vitals.diastolic} mmHg สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (diastolicRange.upper == null && vitals.diastolic != null && vitals.diastolic >= 85) {
    alerts.push({
      level: "WARNING",
      title: "ความดันล่างสูงเล็กน้อย",
      description: `ความดันล่าง ${vitals.diastolic} mmHg ควรติดตาม`,
    });
  }

  if (farBelowDynamicLower(vitals.temperature, temperatureRange.lower, 0.6)) {
    alerts.push({
      level: "CRITICAL",
      title: "อุณหภูมิต่ำ",
      description: `อุณหภูมิ ${vitals.temperature}°C ต่ำกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (belowDynamicLower(vitals.temperature, temperatureRange.lower)) {
    alerts.push({
      level: "WARNING",
      title: "อุณหภูมิต่ำเล็กน้อย",
      description: `อุณหภูมิ ${vitals.temperature}°C ต่ำกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (farAboveDynamicUpper(vitals.temperature, temperatureRange.upper, 0.6)) {
    alerts.push({
      level: "CRITICAL",
      title: "อุณหภูมิสูง",
      description: `อุณหภูมิ ${vitals.temperature}°C สูงกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (aboveDynamicUpper(vitals.temperature, temperatureRange.upper)) {
    alerts.push({
      level: "WARNING",
      title: "อุณหภูมิสูงเล็กน้อย",
      description: `อุณหภูมิ ${vitals.temperature}°C สูงกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (temperatureRange.upper == null && vitals.temperature != null && vitals.temperature >= 38.1) {
    alerts.push({
      level: "CRITICAL",
      title: "อุณหภูมิสูง",
      description: `อุณหภูมิ ${vitals.temperature}°C สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (temperatureRange.upper == null && vitals.temperature != null && vitals.temperature >= 37.5) {
    alerts.push({
      level: "WARNING",
      title: "อุณหภูมิสูงเล็กน้อย",
      description: `อุณหภูมิ ${vitals.temperature}°C ควรติดตาม`,
    });
  }

  if (farBelowDynamicLower(vitals.heartRate, heartRateRange.lower, 12)) {
    alerts.push({
      level: "CRITICAL",
      title: "ชีพจรช้า",
      description: `ชีพจร ${vitals.heartRate} bpm ต่ำกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (belowDynamicLower(vitals.heartRate, heartRateRange.lower)) {
    alerts.push({
      level: "WARNING",
      title: "ชีพจรช้าเล็กน้อย",
      description: `ชีพจร ${vitals.heartRate} bpm ต่ำกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (farAboveDynamicUpper(vitals.heartRate, heartRateRange.upper, 12)) {
    alerts.push({
      level: "CRITICAL",
      title: "ชีพจรเร็ว",
      description: `ชีพจร ${vitals.heartRate} bpm สูงกว่าเกณฑ์เฉพาะบุคคลมาก`,
    });
  } else if (aboveDynamicUpper(vitals.heartRate, heartRateRange.upper)) {
    alerts.push({
      level: "WARNING",
      title: "ชีพจรเร็วเล็กน้อย",
      description: `ชีพจร ${vitals.heartRate} bpm สูงกว่าค่าปกติเฉพาะบุคคล`,
    });
  } else if (heartRateRange.upper == null && vitals.heartRate != null && vitals.heartRate >= 101) {
    alerts.push({
      level: "CRITICAL",
      title: "ชีพจรเร็ว",
      description: `ชีพจร ${vitals.heartRate} bpm สูงกว่าเกณฑ์ปกติ`,
    });
  } else if (heartRateRange.upper == null && vitals.heartRate != null && vitals.heartRate >= 90) {
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
