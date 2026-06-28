import { prisma } from "@/lib/prisma";
import { callBrain, type BaselineAssessmentResult } from "@/lib/brain-api";

function thresholdValue(
  thresholds: Record<string, number | null> | undefined,
  key: string
) {
  const value = thresholds?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function calculateAndPersistPatientBaseline({
  orgId,
  patientId,
  k = 1.5,
}: {
  orgId: string;
  patientId: string;
  k?: number;
}) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [patient, vitals] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
      select: { id: true },
    }),
    prisma.vitalSign.findMany({
      where: {
        patientId,
        organizationId: orgId,
        measuredAt: { gte: since },
      },
      orderBy: { measuredAt: "asc" },
    }),
  ]);

  if (!patient) {
    throw new Error("Patient not found");
  }

  if (vitals.length === 0) {
    const existing = await prisma.patient.update({
      where: { id: patientId },
      data: {
        baselineInsightText: "ยังไม่มีข้อมูลสัญญาณชีพในช่วง 7 วันที่ผ่านมา ระบบจึงคง baseline เดิมไว้",
        baselineCalculatedAt: new Date(),
      },
      select: {
        id: true,
        baselineInsightText: true,
        baselineCalculatedAt: true,
      },
    });

    return {
      patient: existing,
      thresholds: undefined,
      vitalsUsed: 0,
      threadId: null,
    };
  }

  const assessment = await callBrain<BaselineAssessmentResult>("/brain/baseline", {
    method: "POST",
    body: JSON.stringify({
      patient_id: patientId,
      k,
      vitals_history: vitals.map((vital) => ({
        measured_at: vital.measuredAt.toISOString(),
        systolic: vital.systolic,
        diastolic: vital.diastolic,
        temperature: vital.temperature,
        heart_rate: vital.heartRate,
        oxygen_sat: vital.oxygenSat,
      })),
    }),
  });

  const thresholds = assessment.state.calculated_thresholds;
  const updated = await prisma.patient.update({
    where: { id: patientId },
    data: {
      baselineSystolicLower: thresholdValue(thresholds, "baseline_systolic_lower"),
      baselineSystolicUpper: thresholdValue(thresholds, "baseline_systolic_upper"),
      baselineDiastolicLower: thresholdValue(thresholds, "baseline_diastolic_lower"),
      baselineDiastolicUpper: thresholdValue(thresholds, "baseline_diastolic_upper"),
      baselineTemperatureLower: thresholdValue(thresholds, "baseline_temperature_lower"),
      baselineTemperatureUpper: thresholdValue(thresholds, "baseline_temperature_upper"),
      baselineHeartRateLower: thresholdValue(thresholds, "baseline_heart_rate_lower"),
      baselineHeartRateUpper: thresholdValue(thresholds, "baseline_heart_rate_upper"),
      baselineOxygenSatMin: thresholdValue(thresholds, "baseline_oxygen_sat_min"),
      baselineOxygenSatMax: thresholdValue(thresholds, "baseline_oxygen_sat_max"),
      baselineInsightText: assessment.state.ai_insight_text ?? null,
      baselineCalculatedAt: new Date(),
    },
    select: {
      id: true,
      baselineInsightText: true,
      baselineCalculatedAt: true,
    },
  });

  return {
    patient: updated,
    thresholds,
    vitalsUsed: vitals.length,
    threadId: assessment.thread_id,
  };
}
