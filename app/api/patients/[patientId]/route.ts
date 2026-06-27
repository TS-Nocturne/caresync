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
    dosage: string;
    scheduleTime: string;
    timeOfDay: string[];
    instruction: string | null;
  }> = [];

  for (const med of medications ?? []) {
    const times = med.timeOfDay?.length ? med.timeOfDay : (["MORNING"] as TimeOfDay[]);
    for (const slot of times) {
      rows.push({
        organizationId: orgId,
        patientId,
        name: sanitizeText(med.name, 200),
        dosage: sanitizeText(med.dosage, 200),
        scheduleTime: TIME_OF_DAY_SCHEDULE[slot],
        timeOfDay: [slot],
        instruction: sanitizeText(med.instruction, 500) || null,
      });
    }
  }

  return rows.filter((row) => row.name && row.dosage);
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
                dosage: med.dosage,
                timeOfDay: med.timeOfDay.length ? (med.timeOfDay as TimeOfDay[]) : ["MORNING"],
                instruction: med.instruction ?? "",
              }))
            : [{ name: "", dosage: "", timeOfDay: ["MORNING"], instruction: "" }],
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
          title: "แก้ไขข้อมูลผู้ป่วย",
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
      message: "แก้ไขข้อมูลผู้ป่วยสำเร็จ",
    });
  } catch (error) {
    return apiError(error, "Failed to update patient");
  }
}
