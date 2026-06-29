import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/auth-server";
import { syncPatientContextToPinecone } from "@/lib/patient-context-sync";
import {
  TIME_OF_DAY_SCHEDULE,
  type PatientRegistrationInput,
  type TimeOfDay,
} from "@/lib/patient-registration";
import { apiError, readJsonBody, sanitizeText } from "@/lib/api-security";
import { requireWritableSubscription } from "@/lib/subscriptions";

async function requireOwnerOrAdmin(orgId: string, userId: string) {
  const member = await requireOrgMembership(orgId, userId);
  if (member.role !== "owner" && member.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toTextValue(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

function medicationRows(orgId: string, patientId: string, medications: PatientRegistrationInput["medications"]) {
  const rows: Array<{
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
    selfAdministered: boolean;
  }> = [];

  for (const med of medications ?? []) {
    const doseAmount = Number(med.doseAmount);
    if (!med.name.trim() || !med.strength.trim() || !Number.isFinite(doseAmount) || doseAmount <= 0 || !med.doseUnit.trim()) {
      continue;
    }
    const times = med.isPrn
      ? []
      : med.timeOfDay?.length ? med.timeOfDay : (["MORNING"] as TimeOfDay[]);
    const rowsForMed = med.isPrn ? ([null] as const) : times;
    for (const slot of rowsForMed) {
      rows.push({
        organizationId: orgId,
        patientId,
        name: sanitizeText(med.name, 200),
        strength: sanitizeText(med.strength, 80) || null,
        doseAmount,
        doseUnit: sanitizeText(med.doseUnit, 40) || null,
        dosage: `${med.doseAmount} ${med.doseUnit}`.trim(),
        scheduleTime: slot ? TIME_OF_DAY_SCHEDULE[slot] : "PRN",
        timeOfDay: slot ? [slot] : [],
        isPrn: med.isPrn ?? false,
        frequency: med.frequency ?? "DAILY",
        frequencyDays: med.frequency === "CUSTOM_DAYS" ? (med.frequencyDays ?? []) : [],
        indication: sanitizeText(med.indication, 200) || null,
        appearance: sanitizeText(med.appearance, 200) || null,
        instruction: sanitizeText(med.instruction, 500) || null,
        selfAdministered: med.selfAdministered ?? false,
      });
    }
  }

  return rows.filter((row) => row.name && row.strength && row.doseAmount && row.doseAmount > 0 && row.doseUnit);
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

export async function GET(request: Request, context: { params: Promise<{ patientId: string }> }) {
  try {
    const session = await requireSession();
    const { patientId } = await context.params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    await requireOwnerOrAdmin(orgId, session.user.id);

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
      include: {
        emergencyContacts: { orderBy: { id: "asc" } },
        medications: { orderBy: { id: "asc" } },
        consents: {
          where: { consentType: "AI_PROCESSING", revokedAt: null },
          take: 1,
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        currentStep: 2,
        updatedAt: patient.updatedAt,
        data: {
          consentRelation: "ผู้ดูแลแก้ไขข้อมูล",
          consentMandatory: true,
          consentOptional: patient.consents[0]?.granted ?? false,
          firstName: patient.firstName,
          lastName: patient.lastName,
          nickname: patient.nickname ?? "",
          dateOfBirth: toDateInputValue(patient.dateOfBirth),
          gender: patient.gender,
          bloodType: patient.bloodType ?? "",
          weightKg: toTextValue(patient.weightKg),
          heightCm: toTextValue(patient.heightCm),
          roomNumber: patient.roomNumber ?? "",
          underlyingDiseases: patient.underlyingDiseases,
          customDisease: "",
          allergies: patient.allergies,
          customAllergy: "",
          mobilityStatus: patient.mobilityStatus,
          baselineSystolic: toTextValue(patient.baselineSystolic),
          baselineDiastolic: toTextValue(patient.baselineDiastolic),
          baselineTemperature: toTextValue(patient.baselineTemperature),
          baselineHeartRate: toTextValue(patient.baselineHeartRate),
          baselineOxygenSat: toTextValue(patient.baselineOxygenSat),
          medications: patient.medications.length
            ? patient.medications.map((med) => ({
                name: med.name,
                strength: med.strength ?? "",
                doseAmount: med.doseAmount == null ? "" : String(med.doseAmount),
                doseUnit: med.doseUnit ?? "เม็ด",
                dosage: med.dosage,
                timeOfDay: med.timeOfDay.length ? (med.timeOfDay as TimeOfDay[]) : ["MORNING"],
                isPrn: med.isPrn,
                frequency: (med.frequency as PatientRegistrationInput["medications"][number]["frequency"]) ?? "DAILY",
                frequencyDays: med.frequencyDays,
                indication: med.indication ?? "",
                appearance: med.appearance ?? "",
                instruction: med.instruction ?? "",
                selfAdministered: med.selfAdministered,
              }))
            : [{
                name: "",
                strength: "",
                doseAmount: "",
                doseUnit: "เม็ด",
                dosage: "",
                timeOfDay: ["MORNING"],
                isPrn: false,
                frequency: "DAILY",
                frequencyDays: [],
                indication: "",
                appearance: "",
                instruction: "",
                selfAdministered: false,
              }],
          preferredHospital: patient.preferredHospital ?? "",
          hospitalNumber: patient.hospitalNumber ?? "",
          insuranceType: patient.insuranceType ?? "SOCIAL_SECURITY",
          emergencyContacts: patient.emergencyContacts.length
            ? patient.emergencyContacts.map((contact) => ({
                name: contact.name,
                phone: contact.phone,
                relation: contact.relation ?? "",
                isPrimary: contact.isPrimary,
              }))
            : [{ name: "", phone: "", relation: "", isPrimary: true }],
        },
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch patient");
  }
}

export async function PUT(request: Request, context: { params: Promise<{ patientId: string }> }) {
  try {
    const session = await requireSession();
    const { patientId } = await context.params;
    const body = await readJsonBody<PatientRegistrationInput>(request);

    if (!body.orgId || !body.firstName || !body.lastName || !body.dateOfBirth || !body.gender) {
      return NextResponse.json({ error: "Missing required patient fields" }, { status: 400 });
    }

    if (hasIncompleteMedication(body.medications)) {
      return NextResponse.json(
        { error: "Medication name, strength, and dose are required for every medication" },
        { status: 400 }
      );
    }

    await requireOwnerOrAdmin(body.orgId, session.user.id);
    await requireWritableSubscription(body.orgId);

    const existing = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: body.orgId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patient = await prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: patientId },
        data: {
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
          pineconeSyncStatus: "PENDING",
        },
      });

      await tx.emergencyContact.deleteMany({ where: { patientId } });
      if (body.emergencyContacts?.length) {
        await tx.emergencyContact.createMany({
          data: body.emergencyContacts.map((contact, index) => ({
            patientId,
            name: sanitizeText(contact.name, 120),
            phone: sanitizeText(contact.phone, 20),
            relation: sanitizeText(contact.relation, 60) || null,
            isPrimary: contact.isPrimary ?? index === 0,
          })),
        });
      }

      await tx.medication.deleteMany({ where: { patientId } });
      const meds = medicationRows(body.orgId, patientId, body.medications ?? []);
      if (meds.length) {
        await tx.medication.createMany({ data: meds });
      }

      await tx.activityLog.create({
        data: {
          organizationId: body.orgId,
          patientId,
          type: "SYSTEM_NOTE",
          title: "แก้ไขข้อมูลผู้สูงอายุ",
          description: `${sanitizeText(body.firstName, 120)} ${sanitizeText(body.lastName, 120)} — profile updated`,
          userId: session.user.id,
        },
      });

      return tx.patient.findUniqueOrThrow({
        where: { id: patientId },
        include: {
          emergencyContacts: true,
          medications: true,
        },
      });
    });

    syncPatientContextToPinecone(patient).catch((err) => {
      console.error("[patients/[patientId]/route] Failed to sync to Pinecone in background:", err);
    });

    return NextResponse.json({
      data: patient,
      message: "แก้ไขข้อมูลผู้สูงอายุสำเร็จ",
    });
  } catch (error) {
    return apiError(error, "Failed to update patient");
  }
}
