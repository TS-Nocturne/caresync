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

function formatRecentCareContext({
  submittedSymptoms,
  submittedNotes,
  recentSymptoms,
  recentPainLogs,
  recentMedicationLogs,
}: {
  submittedSymptoms: string[];
  submittedNotes?: string;
  recentSymptoms: Array<{ symptom: string; notes: string | null; loggedAt: Date }>;
  recentPainLogs: Array<{ bodyPart: string; painLevel: number; loggedAt: Date }>;
  recentMedicationLogs: Array<{ title: string; description: string; createdAt: Date }>;
}) {
  const lines: string[] = [];

  if (submittedSymptoms.length > 0 || submittedNotes) {
    lines.push(
      `Current submitted abnormal symptoms: ${submittedSymptoms.join(", ") || "-"}${
        submittedNotes ? `; notes: ${submittedNotes}` : ""
      }`
    );
  }

  for (const item of recentSymptoms) {
    lines.push(
      `Recent symptom ${item.loggedAt.toISOString()}: ${item.symptom}${item.notes ? `; notes: ${item.notes}` : ""}`
    );
  }

  for (const item of recentPainLogs) {
    lines.push(`Recent pain ${item.loggedAt.toISOString()}: ${item.bodyPart}, level ${item.painLevel}/10`);
  }

  for (const item of recentMedicationLogs) {
    lines.push(`Recent medication event ${item.createdAt.toISOString()}: ${item.title} - ${item.description}`);
  }

  if (lines.length === 0) return "No abnormal symptoms, pain logs, or medication events recorded in the last 24 hours.";
  return lines.slice(0, 40).join("\n");
}

type MedicationForBrain = {
  name: string;
  strength: string | null;
  doseAmount: number | null;
  doseUnit: string | null;
  dosage: string;
  isPrn: boolean;
  frequency: string;
  indication: string | null;
  instruction: string | null;
  status: string;
  givenAt: Date | null;
};

type MedicationEventForBrain = {
  title: string;
  description: string;
  createdAt: Date;
};

function formatMedicationForBrain(med: MedicationForBrain) {
  return [
    med.name,
    med.strength,
    med.doseAmount != null && med.doseUnit ? `${med.doseAmount} ${med.doseUnit}` : med.dosage,
    med.isPrn ? "PRN/as-needed" : med.frequency,
    med.indication ? `for ${med.indication}` : null,
    med.instruction ? `instruction: ${med.instruction}` : null,
    med.status ? `status ${med.status}` : null,
    med.givenAt ? `given at ${med.givenAt.toISOString()}` : null,
  ].filter(Boolean).join(" ");
}

function formatMedicationEventForBrain(event: MedicationEventForBrain) {
  return `recent medication event ${event.createdAt.toISOString()}: ${event.title} - ${event.description}`;
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
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await recordSymptoms({
      orgId,
      patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      symptoms,
      notes,
      userId: session.user.id,
    });

    const [recentSymptoms, recentPainLogs, recentMedicationLogs] = await Promise.all([
      prisma.symptomLog.findMany({
        where: { organizationId: orgId, patientId, loggedAt: { gte: since } },
        orderBy: { loggedAt: "desc" },
        take: 20,
        select: { symptom: true, notes: true, loggedAt: true },
      }),
      prisma.painLog.findMany({
        where: { organizationId: orgId, patientId, loggedAt: { gte: since } },
        orderBy: { loggedAt: "desc" },
        take: 20,
        select: { bodyPart: true, painLevel: true, loggedAt: true },
      }),
      prisma.activityLog.findMany({
        where: {
          organizationId: orgId,
          patientId,
          createdAt: { gte: since },
          type: { in: ["MEDICATION_GIVEN", "MEDICATION_SKIPPED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { title: true, description: true, createdAt: true },
      }),
    ]);

    const recentCareContext = formatRecentCareContext({
      submittedSymptoms: symptoms,
      submittedNotes: notes,
      recentSymptoms,
      recentPainLogs,
      recentMedicationLogs,
    });

    const medicationsForBrain = [
      ...patient.medications.map(formatMedicationForBrain),
      ...recentMedicationLogs.map(formatMedicationEventForBrain),
    ];

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
        current_medications: medicationsForBrain,
        recent_care_context: recentCareContext,
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
