import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/auth-server";
import { assessVitalRisk, summarizeVitalAlerts } from "@/lib/vital-alerts";
import { apiError, readJsonBody } from "@/lib/api-security";
import { requireWritableSubscription } from "@/lib/subscriptions";
import { getPortalAccess, requirePatientAccess } from "@/lib/workspace-access";

type VitalsRequestBody = {
  orgId?: unknown;
  patientId?: unknown;
  systolic?: unknown;
  diastolic?: unknown;
  temperature?: unknown;
  heartRate?: unknown;
  oxygenSat?: unknown;
  notes?: unknown;
};

function isOptionalPositiveNumber(value: unknown) {
  if (value === undefined || value === null) return true;
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function toNullableNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function actorRoleLabel(access: Awaited<ReturnType<typeof getPortalAccess>>) {
  if (access?.isFamily && !access.isCaregiver && !access.isOwner && !access.isAdmin) return "FAMILY";
  return "CAREGIVER";
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const orgId = searchParams.get("orgId");

    if (!patientId || !orgId) {
      return NextResponse.json(
        { error: "patientId and orgId are required" },
        { status: 400 }
      );
    }

    await requireOrgMembership(orgId, session.user.id);

    const vitals = await prisma.vitalSign.findMany({
      where: { patientId, organizationId: orgId },
      orderBy: { measuredAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ data: vitals });
  } catch (error) {
    return apiError(error, "Failed to fetch vitals");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<VitalsRequestBody>(request);
    const { orgId, patientId, systolic, diastolic, temperature, heartRate, oxygenSat, notes } = body;

    if (typeof orgId !== "string" || typeof patientId !== "string") {
      return NextResponse.json(
        { error: "orgId and patientId are required" },
        { status: 400 }
      );
    }

    if (
      !isOptionalPositiveNumber(systolic) ||
      !isOptionalPositiveNumber(diastolic) ||
      !isOptionalPositiveNumber(temperature) ||
      !isOptionalPositiveNumber(heartRate) ||
      !isOptionalPositiveNumber(oxygenSat)
    ) {
      return NextResponse.json({ error: "Invalid vital sign values" }, { status: 400 });
    }

    await requireOrgMembership(orgId, session.user.id);
    await requireWritableSubscription(orgId);
    await requirePatientAccess(orgId, session.user.id, patientId);
    const access = await getPortalAccess(orgId, session.user.id);

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
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
      recordedByRole: actorRoleLabel(access),
    };

    const newVital = await prisma.vitalSign.create({ data: vitalData });

    const description = [
      systolic != null && diastolic != null
        ? `ความดัน ${systolic}/${diastolic}`
        : null,
      temperature != null ? `อุณหภูมิ ${temperature}°C` : null,
      heartRate != null ? `ชีพจร ${heartRate} bpm` : null,
      oxygenSat != null ? `SpO2 ${oxygenSat}%` : null,
    ]
      .filter(Boolean)
      .join(", ");

    await prisma.activityLog.create({
      data: {
        organizationId: orgId,
        patientId,
        type: "VITAL_RECORDED",
        title: "บันทึกค่าสถิติร่างกาย",
        description: `${patient.firstName} ${patient.lastName}: ${description} — recorded by ${actorRoleLabel(access).toLowerCase()}`,
        userId: session.user.id,
      },
    });

    const riskAlerts = assessVitalRisk(vitalData, patient);
    const groupedAlert = summarizeVitalAlerts(riskAlerts);
    for (const alert of riskAlerts) {
      await prisma.alert.create({
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
      await prisma.activityLog.create({
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

    return NextResponse.json({
      success: true,
      data: newVital,
      alertsTriggered: riskAlerts.length,
      message: "บันทึกค่าสถิติร่างกายสำเร็จ",
    });
  } catch (error) {
    return apiError(error, "Failed to save vitals");
  }
}
