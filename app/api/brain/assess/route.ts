import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { callBrain, type BrainAssessmentResult } from "@/lib/brain-api";
import { apiError, readJsonBody, sanitizeText, sanitizeTextList } from "@/lib/api-security";
import { requireWritableSubscription } from "@/lib/subscriptions";

type AssessBody = {
  orgId?: string;
  patientId?: string;
  vitals?: Record<string, unknown>;
  symptoms?: string[];
  notes?: string;
  validation_confirmed?: boolean;
};

function toAlertLevel(riskLevel?: string) {
  if (riskLevel === "critical") return "CRITICAL";
  if (riskLevel === "warning") return "WARNING";
  return "INFO";
}

async function recordSymptoms({
  orgId,
  patientId,
  patientName,
  symptoms,
  notes,
  userId,
}: {
  orgId: string;
  patientId: string;
  patientName: string;
  symptoms: string[];
  notes?: string;
  userId: string;
}) {
  if (symptoms.length === 0) return;

  await prisma.symptomLog.createMany({
    data: symptoms.map((symptom) => ({
      organizationId: orgId,
      patientId,
      symptom,
      notes: notes ?? null,
    })),
  });

  await prisma.activityLog.create({
    data: {
      organizationId: orgId,
      patientId,
      type: "SYMPTOM_LOGGED",
      title: "Abnormal symptoms recorded",
      description: `${patientName}: ${symptoms.join(", ")}${notes ? ` - ${notes}` : ""}`,
      userId,
    },
  });
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<AssessBody>(request);
    const { orgId, patientId } = body;

    if (!orgId || !patientId) {
      return NextResponse.json({ error: "orgId and patientId are required" }, { status: 400 });
    }

    await requireOrgMembership(orgId, session.user.id);
    await requireWritableSubscription(orgId);

    const { requireCaregiverWriteAccess } = await import("@/lib/caregiver-access");
    await requireCaregiverWriteAccess(orgId, session.user.id, patientId);

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
      include: {
        medications: {
          where: { status: { in: ["PENDING", "GIVEN"] } },
          orderBy: { scheduleTime: "asc" },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const symptoms = sanitizeTextList(body.symptoms);
    const notes = sanitizeText(body.notes, 1000) || undefined;

    const assessment = await callBrain<BrainAssessmentResult>("/brain/assess", {
      method: "POST",
      body: JSON.stringify({
        patient_id: patientId,
        vitals: body.vitals ?? {},
        patient_baseline: {
          baseline_systolic: patient.baselineSystolic,
          baseline_diastolic: patient.baselineDiastolic,
          baseline_temperature: patient.baselineTemperature,
          baseline_heart_rate: patient.baselineHeartRate,
          baseline_oxygen_sat: patient.baselineOxygenSat,
          baseline_systolic_lower: patient.baselineSystolicLower,
          baseline_systolic_upper: patient.baselineSystolicUpper,
          baseline_diastolic_lower: patient.baselineDiastolicLower,
          baseline_diastolic_upper: patient.baselineDiastolicUpper,
          baseline_temperature_lower: patient.baselineTemperatureLower,
          baseline_temperature_upper: patient.baselineTemperatureUpper,
          baseline_heart_rate_lower: patient.baselineHeartRateLower,
          baseline_heart_rate_upper: patient.baselineHeartRateUpper,
          baseline_oxygen_sat_min: patient.baselineOxygenSatMin,
          baseline_oxygen_sat_max: patient.baselineOxygenSatMax,
          baseline_insight_text: patient.baselineInsightText,
          baseline_calculated_at: patient.baselineCalculatedAt?.toISOString() ?? null,
        },
        symptoms,
        current_medications: patient.medications.map((med) =>
          [
            med.name,
            med.strength,
            med.doseAmount != null && med.doseUnit ? `${med.doseAmount} ${med.doseUnit}` : med.dosage,
            med.isPrn ? "PRN" : med.frequency,
            med.indication ? `for ${med.indication}` : null,
          ].filter(Boolean).join(" ")
        ),
        validation_confirmed: body.validation_confirmed ?? false,
      }),
    });

    await prisma.brainThread.upsert({
      where: { threadId: assessment.thread_id },
      update: {
        organizationId: orgId,
        patientId,
        createdById: session.user.id,
        status: assessment.status,
      },
      create: {
        threadId: assessment.thread_id,
        organizationId: orgId,
        patientId,
        createdById: session.user.id,
        status: assessment.status,
      },
    });

    if (assessment.status === "needs_confirmation") {
      return NextResponse.json({
        ...assessment,
        alertId: null,
        validation_issues: assessment.state.validation_issues ?? [],
      });
    }

    await recordSymptoms({
      orgId,
      patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      symptoms,
      notes,
      userId: session.user.id,
    });

    let alertId: string | null = null;
    const riskLevel = assessment.state.risk_level;
    if (riskLevel === "warning" || riskLevel === "critical") {
      const alert = await prisma.alert.create({
        data: {
          organizationId: orgId,
          patientId,
          level: toAlertLevel(riskLevel),
          title: `ข้อมูลจาก AI ที่ควรให้ผู้ดูแลตรวจสอบ: ${riskLevel}`,
          description:
            assessment.state.ai_analysis ??
            "ข้อมูลนี้เป็นข้อสังเกตเพื่อการประสานงาน ไม่ใช่คำวินิจฉัยหรือคำสั่งรักษา",
          actionTaken: JSON.stringify({
            brainThreadId: assessment.thread_id,
            status: assessment.status,
            recommendedActions: assessment.state.recommended_actions ?? [],
          }),
        },
      });
      alertId = alert.id;

      await prisma.brainThread.update({
        where: { threadId: assessment.thread_id },
        data: { alertId, status: assessment.status },
      });

      await prisma.activityLog.create({
        data: {
          organizationId: orgId,
          patientId,
          type: "ALERT_TRIGGERED",
          title: alert.title,
          description: alert.description,
          userId: null,
        },
      });
    }

    return NextResponse.json({ ...assessment, alertId });
  } catch (error) {
    return apiError(error, "Failed to assess patient");
  }
}
