import { NextResponse } from "next/server";
import { ConsentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/auth-server";
import { syncPatientContextToPinecone } from "@/lib/patient-context-sync";
import {
  TIME_OF_DAY_SCHEDULE,
  type PatientRegistrationInput,
  type TimeOfDay,
  calculateAge,
} from "@/lib/patient-registration";
import { getPatientStatus } from "@/lib/vital-alerts";
import { apiError, readJsonBody, sanitizeText } from "@/lib/api-security";
import { getPatientWhereForUser } from "@/lib/workspace-access";
import { requireWritableSubscription } from "@/lib/subscriptions";

async function requireOwnerOrAdmin(orgId: string, userId: string) {
  const member = await requireOrgMembership(orgId, userId);
  if (member.role !== "owner" && member.role !== "admin") {
    throw new Error("Forbidden");
  }
  return member;
}

function hasIncompleteMedication(medications: PatientRegistrationInput["medications"]) {
  return (medications ?? []).some((med) => {
    const hasAny = Boolean(med.name?.trim() || med.strength?.trim() || String(med.doseAmount ?? "").trim());
    const doseAmount = Number(med.doseAmount);
    const missingRequired = hasAny && !(
      med.name?.trim() &&
      med.strength?.trim() &&
      String(med.doseAmount ?? "").trim() &&
      Number.isFinite(doseAmount) &&
      doseAmount > 0 &&
      med.doseUnit?.trim()
    );
    const missingCustomDays =
      hasAny && !med.isPrn && med.frequency === "CUSTOM_DAYS" && (med.frequencyDays ?? []).length === 0;
    return missingRequired || missingCustomDays;
  });
}

function medicationDosage(med: PatientRegistrationInput["medications"][number]) {
  return `${med.doseAmount} ${med.doseUnit}`.trim();
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    await requireOrgMembership(orgId, session.user.id);
    const patientWhere = await getPatientWhereForUser(orgId, session.user.id);

    const patients = await prisma.patient.findMany({
      where: patientWhere,
      orderBy: { updatedAt: "desc" },
      include: {
        vitalSigns: { orderBy: { measuredAt: "desc" }, take: 1 },
        caregivers: {
          take: 1,
          include: { user: { select: { name: true } } },
        },
        consents: {
          where: { consentType: "AI_PROCESSING", revokedAt: null },
          take: 1,
        },
      },
    });

    const data = patients.map((patient) => {
      const latestVital = patient.vitalSigns[0];
      const aiEnabled = patient.consents?.[0]?.granted ?? false;
      const status = getPatientStatus(
        latestVital
          ? {
              systolic: latestVital.systolic,
              diastolic: latestVital.diastolic,
              temperature: latestVital.temperature,
              heartRate: latestVital.heartRate,
              oxygenSat: latestVital.oxygenSat,
            }
          : null,
        patient
      );

      return {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        nickname: patient.nickname,
        age: calculateAge(patient.dateOfBirth),
        roomNumber: patient.roomNumber,
        allergies: patient.allergies,
        mobilityStatus: patient.mobilityStatus,
        baselineSystolic: patient.baselineSystolic,
        baselineDiastolic: patient.baselineDiastolic,
        baselineTemperature: patient.baselineTemperature,
        baselineHeartRate: patient.baselineHeartRate,
        baselineOxygenSat: patient.baselineOxygenSat,
        baselineSystolicLower: patient.baselineSystolicLower,
        baselineSystolicUpper: patient.baselineSystolicUpper,
        baselineDiastolicLower: patient.baselineDiastolicLower,
        baselineDiastolicUpper: patient.baselineDiastolicUpper,
        baselineTemperatureLower: patient.baselineTemperatureLower,
        baselineTemperatureUpper: patient.baselineTemperatureUpper,
        baselineHeartRateLower: patient.baselineHeartRateLower,
        baselineHeartRateUpper: patient.baselineHeartRateUpper,
        baselineOxygenSatMin: patient.baselineOxygenSatMin,
        baselineOxygenSatMax: patient.baselineOxygenSatMax,
        baselineInsightText: patient.baselineInsightText,
        baselineCalculatedAt: patient.baselineCalculatedAt,
        status,
        lastUpdate: latestVital?.measuredAt ?? patient.updatedAt,
        caregiverName: patient.caregivers[0]?.user.name ?? null,
        aiEnabled,
        pineconeSyncStatus: patient.pineconeSyncStatus,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error, "Failed to fetch patients");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<PatientRegistrationInput>(request);

    if (!body.orgId || !body.firstName || !body.lastName || !body.dateOfBirth || !body.gender) {
      return NextResponse.json({ error: "Missing required patient fields" }, { status: 400 });
    }

    if (!body.consentMandatory || !body.consentRelation) {
      return NextResponse.json({ error: "Consent and relation are required" }, { status: 400 });
    }

    if (hasIncompleteMedication(body.medications)) {
      return NextResponse.json(
        { error: "Medication name, strength, and dose are required for every medication" },
        { status: 400 }
      );
    }

    await requireOwnerOrAdmin(body.orgId, session.user.id);
    await requireWritableSubscription(body.orgId);

    const patient = await prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          organizationId: body.orgId,
          firstName: sanitizeText(body.firstName, 120),
          lastName: sanitizeText(body.lastName, 120),
          nickname: sanitizeText(body.nickname, 60) || null,
          dateOfBirth: new Date(body.dateOfBirth),
          gender: sanitizeText(body.gender, 20),
          bloodType: sanitizeText(body.bloodType, 10) || null,
          weightKg: body.weightKg ?? null,
          heightCm: body.heightCm ?? null,
          roomNumber: sanitizeText(body.roomNumber, 20) || null,
          underlyingDiseases: body.underlyingDiseases ?? [],
          allergies: body.allergies ?? [],
          mobilityStatus: body.mobilityStatus ?? "INDEPENDENT",
          baselineSystolic: body.baselineSystolic ?? null,
          baselineDiastolic: body.baselineDiastolic ?? null,
          baselineTemperature: body.baselineTemperature ?? null,
          baselineHeartRate: body.baselineHeartRate ?? null,
          baselineOxygenSat: body.baselineOxygenSat ?? null,
          preferredHospital: sanitizeText(body.preferredHospital, 200) || null,
          hospitalNumber: sanitizeText(body.hospitalNumber, 50) || null,
          insuranceType: body.insuranceType ?? null,
        },
      });

      if (body.emergencyContacts?.length) {
        await tx.emergencyContact.createMany({
          data: body.emergencyContacts.map((c) => ({
            patientId: created.id,
            name: sanitizeText(c.name, 120),
            phone: sanitizeText(c.phone, 20),
            relation: sanitizeText(c.relation, 60) || null,
            isPrimary: c.isPrimary ?? false,
          })),
        });
      }

      const medRows: Array<{
        organizationId: string;
        patientId: string;
        name: string;
        strength: string | null;
        doseAmount: number | null;
        doseUnit: string | null;
        dosage: string;
        scheduleTime: string;
        timeOfDay: string[];
        isPrn: boolean;
        frequency: string;
        frequencyDays: number[];
        indication: string | null;
        appearance: string | null;
        instruction: string | null;
      }> = [];

      for (const med of body.medications ?? []) {
        const doseAmount = Number(med.doseAmount);
        if (!med.name.trim() || !med.strength.trim() || !Number.isFinite(doseAmount) || doseAmount <= 0 || !med.doseUnit.trim()) {
          continue;
        }
        const times = med.isPrn
          ? []
          : med.timeOfDay?.length ? med.timeOfDay : (["MORNING"] as TimeOfDay[]);
        const rowsForMed = med.isPrn ? ([null] as const) : times;
        for (const slot of rowsForMed) {
          medRows.push({
            organizationId: body.orgId,
            patientId: created.id,
            name: sanitizeText(med.name, 200),
            strength: sanitizeText(med.strength, 80) || null,
            doseAmount,
            doseUnit: sanitizeText(med.doseUnit, 40) || null,
            dosage: medicationDosage(med),
            scheduleTime: slot ? TIME_OF_DAY_SCHEDULE[slot] : "PRN",
            timeOfDay: slot ? [slot] : [],
            isPrn: med.isPrn ?? false,
            frequency: med.frequency ?? "DAILY",
            frequencyDays: med.frequency === "CUSTOM_DAYS" ? (med.frequencyDays ?? []) : [],
            indication: sanitizeText(med.indication, 200) || null,
            appearance: sanitizeText(med.appearance, 200) || null,
            instruction: sanitizeText(med.instruction, 500) || null,
          });
        }
      }

      const completeMedRows = medRows.filter((row) => row.name && row.strength && row.doseAmount && row.doseAmount > 0 && row.doseUnit);
      if (completeMedRows.length) {
        await tx.medication.createMany({ data: completeMedRows });
      }

      const hasBaseline =
        body.baselineSystolic != null ||
        body.baselineDiastolic != null ||
        body.baselineTemperature != null ||
        body.baselineHeartRate != null ||
        body.baselineOxygenSat != null;

      if (hasBaseline) {
        await tx.vitalSign.create({
          data: {
            organizationId: body.orgId,
            patientId: created.id,
            systolic: body.baselineSystolic ?? null,
            diastolic: body.baselineDiastolic ?? null,
            temperature: body.baselineTemperature ?? null,
            heartRate: body.baselineHeartRate ?? null,
            oxygenSat: body.baselineOxygenSat ?? null,
            notes: "baseline — เกณฑ์สัญญาณชีพปกติส่วนบุคคล",
          },
        });
      }

      await tx.activityLog.create({
        data: {
          organizationId: body.orgId,
          patientId: created.id,
          type: "SYSTEM_NOTE",
          title: "ลงทะเบียนผู้ป่วยใหม่",
          description: `${created.firstName} ${created.lastName} — onboarding complete`,
          userId: session.user.id,
        },
      });

      // --- Create Consents ---
      const consentTypes: ConsentType[] = [
        ConsentType.PDPA_GENERAL,
        ConsentType.DATA_SHARING_NURSING,
        ConsentType.DATA_SHARING_FAMILY,
      ];
      if (body.consentOptional) {
        consentTypes.push(ConsentType.AI_PROCESSING);
      }

      const ipAddress = request.headers.get("x-forwarded-for") || "unknown";

      await tx.consent.createMany({
        data: consentTypes.map((type) => ({
          organizationId: body.orgId,
          patientId: created.id,
          consentType: type,
          granted: true,
          grantedByName: sanitizeText(session.user.name, 120),
          grantedByRelation: sanitizeText(body.consentRelation, 120),
          consentVersion: "1.0",
          ipAddress,
        })),
      });

      return tx.patient.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          emergencyContacts: true,
          medications: true,
        },
      });
    });

    syncPatientContextToPinecone(patient).catch(err => {
      console.error("[patients/route] Failed to sync to Pinecone in background:", err);
    });

    return NextResponse.json({
      data: patient,
      message: "ลงทะเบียนผู้ป่วยสำเร็จ",
    });
  } catch (error) {
    return apiError(error, "Failed to create patient");
  }
}
