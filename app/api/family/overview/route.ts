import { NextResponse } from "next/server";
import type { LogType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import {
  getBloodPressureStatus,
  getPatientStatus,
  getVitalMetricStatus,
} from "@/lib/vital-alerts";
import { apiError } from "@/lib/api-security";
import { getAccessiblePatientIds, getPortalAccess, requirePatientAccess } from "@/lib/workspace-access";

type UiLogType = "vital" | "medication" | "system" | "note" | "alert";

const logTypeMap: Record<LogType, UiLogType> = {
  VITAL_RECORDED: "vital",
  MEDICATION_GIVEN: "medication",
  MEDICATION_SKIPPED: "medication",
  SYMPTOM_LOGGED: "note",
  ALERT_TRIGGERED: "alert",
  CHECK_IN: "system",
  CHECK_OUT: "system",
  SYSTEM_NOTE: "note",
  VITAL_REMINDER: "system",
  CONSENT_GRANTED: "system",
};



function toUiStatus(
  vitalStatus: "stable" | "monitoring" | "critical",
  activeAlertLevel?: "INFO" | "WARNING" | "CRITICAL" | null
): "ok" | "warning" | "critical" {
  if (activeAlertLevel === "CRITICAL" || vitalStatus === "critical") return "critical";
  if (activeAlertLevel === "WARNING" || vitalStatus === "monitoring") return "warning";
  return "ok";
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const patientId = searchParams.get("patientId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    await requireOrgMembership(orgId, session.user.id);
    const accessiblePatientIds = await getAccessiblePatientIds(orgId, session.user.id);
    if (accessiblePatientIds === undefined) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (patientId) {
      await requirePatientAccess(orgId, session.user.id, patientId);
    }

    const patient = patientId
      ? await prisma.patient.findFirst({
          where: { id: patientId, organizationId: orgId },
          include: {
            vitalSigns: { orderBy: { measuredAt: "desc" }, take: 1 },
            caregivers: {
              take: 1,
              include: { user: { select: { name: true } } },
            },
            medications: {
              where: { status: { in: ["PENDING", "GIVEN", "SKIPPED"] } },
            },
          },
        })
      : await prisma.patient.findFirst({
          where:
            accessiblePatientIds === null
              ? { organizationId: orgId }
              : { organizationId: orgId, id: { in: accessiblePatientIds } },
          orderBy: { updatedAt: "desc" },
          include: {
            vitalSigns: { orderBy: { measuredAt: "desc" }, take: 1 },
            caregivers: {
              take: 1,
              include: { user: { select: { name: true } } },
            },
            medications: {
              where: { status: { in: ["PENDING", "GIVEN", "SKIPPED"] } },
            },
          },
        });

    if (!patient) {
      if (patientId) {
        return NextResponse.json({ error: "ไม่พบข้อมูลผู้ป่วย" }, { status: 404 });
      }
      return NextResponse.json({
        patient: null,
        status: "ok" as const,
        statusMessage: "ยังไม่มีข้อมูลผู้ป่วยในระบบ",
        vitals: null,
        caregiver: null,
        medications: { given: 0, total: 0 },
        lastUpdate: null,
        activityLogs: [],
      });
    }

    const latestVital = patient.vitalSigns[0] ?? null;
    const vitalInput = latestVital
      ? {
          systolic: latestVital.systolic,
          diastolic: latestVital.diastolic,
          temperature: latestVital.temperature,
          heartRate: latestVital.heartRate,
          oxygenSat: latestVital.oxygenSat,
        }
      : null;

    const activeAlert = await prisma.alert.findFirst({
      where: {
        organizationId: orgId,
        patientId: patient.id,
        resolvedAt: null,
        level: { in: ["WARNING", "CRITICAL"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const vitalStatus = getPatientStatus(vitalInput);
    const status = toUiStatus(vitalStatus, activeAlert?.level ?? null);

    const caregiverName = patient.caregivers[0]?.user.name ?? null;
    let alertMsg = activeAlert?.description;
    if (
      activeAlert?.title === "🚨 ปุ่มฉุกเฉินถูกกด" ||
      activeAlert?.title === "Emergency panic button triggered" ||
      activeAlert?.description?.startsWith("[CareSync แจ้งเตือนวิกฤต]")
    ) {
      alertMsg = "🚨 มีการส่งสัญญาณแจ้งเหตุฉุกเฉิน — กำลังรอผู้เข้าช่วยเหลือ";
    }

    const statusMessage =
      status === "critical"
        ? alertMsg ?? "พบสัญญาณชีพผิดปกติ — กำลังรอผู้เข้าช่วยเหลือ"
        : status === "warning"
          ? alertMsg ?? "มีอาการที่ต้องเฝ้าระวัง — ทีมดูแลกำลังติดตาม"
          : caregiverName
            ? `สัญญาณชีพอยู่ในเกณฑ์ปกติ — ${caregiverName} กำลังดูแล`
            : "สัญญาณชีพอยู่ในเกณฑ์ปกติ";

    const meds = patient.medications;
    const givenCount = meds.filter((m) => m.status === "GIVEN").length;

    const rawLogs = await prisma.activityLog.findMany({
      where: { organizationId: orgId, patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { name: true } } },
    });

    const activityLogs = rawLogs.map((log) => ({
      id: log.id,
      time: log.createdAt.toISOString(),
      type: logTypeMap[log.type],
      title: log.title,
      description: log.description,
      user: log.user?.name ?? "ระบบ",
      createdAt: log.createdAt.toISOString(),
    }));

    const lastVitalAt = latestVital?.measuredAt ?? null;
    const lastLogAt = rawLogs[0]?.createdAt ?? null;
    const lastUpdate =
      lastVitalAt && lastLogAt
        ? lastVitalAt > lastLogAt
          ? lastVitalAt.toISOString()
          : lastLogAt.toISOString()
        : lastVitalAt?.toISOString() ?? lastLogAt?.toISOString() ?? null;

    const access = await getPortalAccess(orgId, session.user.id);
    const canManageAlerts = access ? (access.isOwner || access.isAdmin || access.isCaregiver) : false;

    return NextResponse.json({
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        roomNumber: patient.roomNumber,
      },
      status,
      statusMessage,
      vitals: latestVital
        ? {
            systolic: latestVital.systolic,
            diastolic: latestVital.diastolic,
            temperature: latestVital.temperature,
            heartRate: latestVital.heartRate,
            oxygenSat: latestVital.oxygenSat,
            measuredAt: latestVital.measuredAt.toISOString(),
            bloodPressureStatus: getBloodPressureStatus(
              latestVital.systolic,
              latestVital.diastolic
            ),
            temperatureStatus: getVitalMetricStatus("temperature", latestVital.temperature),
            heartRateStatus: getVitalMetricStatus("heartRate", latestVital.heartRate),
            oxygenStatus: getVitalMetricStatus("oxygenSat", latestVital.oxygenSat),
          }
        : null,
      caregiver: caregiverName ? { name: caregiverName } : null,
      medications: { given: givenCount, total: meds.length },
      lastUpdate,
      activityLogs,
      activeAlertId: activeAlert?.id ?? null,
      canManageAlerts,
    });
  } catch (error) {
    return apiError(error, "Failed to fetch family overview");
  }
}
