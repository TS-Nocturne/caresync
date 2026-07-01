"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/auth-server";
import { requireCaregiverWriteAccess } from "@/lib/caregiver-access";
import { requireWritableSubscription } from "@/lib/subscriptions";
import { assessVitalRisk, summarizeVitalAlerts } from "@/lib/vital-alerts";

export interface CreateVitalSignInput {
  orgId: string;
  patientId: string;
  systolic?: number | null;
  diastolic?: number | null;
  temperature?: number | null;
  heartRate?: number | null;
  oxygenSat?: number | null;
  notes?: string | null;
}

function isOptionalPositiveNumber(value: unknown) {
  if (value === undefined || value === null) return true;
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function toNullableNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

export async function createVitalSignAction(input: CreateVitalSignInput) {
  const session = await requireSession();
  const { orgId, patientId, systolic, diastolic, temperature, heartRate, oxygenSat, notes } = input;

  if (!orgId || !patientId) {
    throw new Error("orgId and patientId are required");
  }

  if (
    !isOptionalPositiveNumber(systolic) ||
    !isOptionalPositiveNumber(diastolic) ||
    !isOptionalPositiveNumber(temperature) ||
    !isOptionalPositiveNumber(heartRate) ||
    !isOptionalPositiveNumber(oxygenSat)
  ) {
    throw new Error("Invalid vital sign values");
  }

  await requireOrgMembership(orgId, session.user.id);
  await requireWritableSubscription(orgId);
  await requireCaregiverWriteAccess(orgId, session.user.id, patientId);

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: orgId },
  });

  if (!patient) {
    throw new Error("Patient not found");
  }

  const vitalData = {
    organizationId: orgId,
    patientId,
    systolic: toNullableNumber(systolic),
    diastolic: toNullableNumber(diastolic),
    temperature: toNullableNumber(temperature),
    heartRate: toNullableNumber(heartRate),
      oxygenSat: toNullableNumber(oxygenSat),
      notes: typeof notes === "string" ? notes : null,
      recordedById: session.user.id,
      recordedByName: session.user.name,
      recordedByRole: "CAREGIVER",
    };

  const description = [
    systolic != null && diastolic != null ? `ความดัน ${systolic}/${diastolic}` : null,
    temperature != null ? `อุณหภูมิ ${temperature}°C` : null,
    heartRate != null ? `ชีพจร ${heartRate} bpm` : null,
    oxygenSat != null ? `SpO2 ${oxygenSat}%` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const riskAlerts = assessVitalRisk(vitalData, patient);
  const groupedAlert = summarizeVitalAlerts(riskAlerts);
  const newVital = await prisma.$transaction(async (tx) => {
    const createdVital = await tx.vitalSign.create({ data: vitalData });

    await tx.activityLog.create({
      data: {
        organizationId: orgId,
        patientId,
        type: "VITAL_RECORDED",
        title: "บันทึกค่าสถิติร่างกาย",
        description: `${patient.firstName} ${patient.lastName}: ${description}`,
        userId: session.user.id,
      },
    });

    for (const alert of riskAlerts) {
      await tx.alert.create({
        data: {
          organizationId: orgId,
          patientId,
          level: alert.level,
          title: alert.title,
          description: alert.description,
        },
      });
    }

    if (groupedAlert) {
      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          patientId,
          type: "ALERT_TRIGGERED",
          title: groupedAlert.title,
          description: groupedAlert.description,
          userId: session.user.id,
        },
      });
    }

    return createdVital;
  });

  return {
    success: true,
    data: {
      id: newVital.id,
      measuredAt: newVital.measuredAt.toISOString(),
    },
    alertsTriggered: riskAlerts.length,
  };
}
