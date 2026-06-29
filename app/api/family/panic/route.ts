import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { apiError, readJsonBody } from "@/lib/api-security";
import { getAccessiblePatientIds, requirePatientAccess } from "@/lib/workspace-access";

type PanicRequest = {
  orgId?: string;
  patientId?: string;
};

const EMERGENCY_PHONE = "1669";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<PanicRequest>(request);
    const orgId = body.orgId;

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    await requireOrgMembership(orgId, session.user.id);
    const accessiblePatientIds = await getAccessiblePatientIds(orgId, session.user.id);
    if (accessiblePatientIds === undefined) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (body.patientId) {
      await requirePatientAccess(orgId, session.user.id, body.patientId);
    }

    const patient = body.patientId
      ? await prisma.patient.findFirst({
          where: { id: body.patientId, organizationId: orgId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            roomNumber: true,
            emergencyContacts: {
              select: { name: true, phone: true, relation: true },
              orderBy: { isPrimary: "desc" },
            },
          },
        })
      : await prisma.patient.findFirst({
          where:
            accessiblePatientIds === null
              ? { organizationId: orgId }
              : { organizationId: orgId, id: { in: accessiblePatientIds } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            roomNumber: true,
            emergencyContacts: {
              select: { name: true, phone: true, relation: true },
              orderBy: { isPrimary: "desc" },
            },
          },
        });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patientName = `${patient.firstName} ${patient.lastName}`;

    // Fetch org name for the alert message
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const orgName = org?.name || "Workspace";

    // Fetch 24-hour retrospective data for a care-coordination summary.
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentVitals = await prisma.vitalSign.findMany({
      where: { patientId: patient.id, measuredAt: { gte: twentyFourHoursAgo } },
      orderBy: { measuredAt: "desc" },
    });
    const recentLogs = await prisma.activityLog.findMany({
      where: {
        patientId: patient.id,
        createdAt: { gte: twentyFourHoursAgo },
        type: { in: ["SYMPTOM_LOGGED", "VITAL_RECORDED", "MEDICATION_GIVEN"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    let aiSummary = "";
    if (recentVitals.length > 0 || recentLogs.length > 0) {
      aiSummary += "\n\n📋 [Care Summary] สรุปข้อมูลย้อนหลัง 24 ชม.:";
      if (recentVitals.length > 0) {
        const v = recentVitals[0];
        aiSummary += `\n- ค่าสถิติร่างกายล่าสุด: BP ${v.systolic}/${v.diastolic}, HR ${v.heartRate}, Temp ${v.temperature}°C, SpO2 ${v.oxygenSat}%`;
      }
      if (recentLogs.length > 0) {
        aiSummary += "\n- เหตุการณ์ล่าสุด:";
        recentLogs.forEach((log) => {
          aiSummary += `\n  • ${log.title}`;
        });
      }
    } else {
      aiSummary += "\n\n📋 [Care Summary] ไม่มีบันทึกข้อมูลใน 24 ชั่วโมงที่ผ่านมา";
    }

    const publicMessage = `[CareSync ขอความช่วยเหลือ] มีผู้ใช้กดปุ่มติดต่อด่วนจาก${orgName} โปรดตรวจสอบสถานการณ์กับผู้ดูแลหน้างาน หากเห็นว่าเป็นเหตุฉุกเฉินให้ติดต่อ ${EMERGENCY_PHONE} หรือบริการฉุกเฉินโดยตรง${aiSummary}`;
    const metadata = {
      source: "family_panic_button",
      status: "panic_triggered",
      emergencyPhone: EMERGENCY_PHONE,
      publicMessage,
      triggeredByUserId: session.user.id,
      triggeredAt: new Date().toISOString(),
    };

    const alert = await prisma.$transaction(async (tx) => {
      const createdAlert = await tx.alert.create({
        data: {
          organizationId: orgId,
          patientId: patient.id,
          level: "CRITICAL",
          title: "ปุ่มติดต่อด่วนถูกกด",
          description: publicMessage,
          actionTaken: JSON.stringify(metadata),
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          patientId: patient.id,
          type: "ALERT_TRIGGERED",
          title: "ปุ่มติดต่อด่วนถูกกด",
          description: publicMessage,
          userId: session.user.id,
        },
      });

      return createdAlert;
    });

    // Dispatch webhook (LINE Notify / n8n / SMS integration)
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "family_panic_button",
            orgId,
            patient: { id: patient.id, name: patientName, roomNumber: patient.roomNumber },
            alertId: alert.id,
            message: publicMessage,
            emergencyPhone: EMERGENCY_PHONE,
            emergencyContacts: patient.emergencyContacts,
          }),
        });
      } catch (error) {
        console.error("[family-panic] webhook failed", error);
      }
    }

    // Optional production notification channel.
    const lineNotifyToken = process.env.LINE_NOTIFY_TOKEN;
    if (lineNotifyToken) {
      try {
        await fetch("https://notify-api.line.me/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Bearer ${lineNotifyToken}`,
          },
          body: `message=${encodeURIComponent(publicMessage)}`,
        });
      } catch (error) {
        console.error("[family-panic] LINE Notify failed", error);
      }
    }

    return NextResponse.json({
      alertId: alert.id,
      patientId: patient.id,
      patientName,
      emergencyPhone: EMERGENCY_PHONE,
      message: publicMessage,
      emergencyContacts: patient.emergencyContacts,
    });
  } catch (error) {
    return apiError(error, "Failed to trigger panic alert");
  }
}
