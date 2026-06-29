import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_VITAL_ROUNDS, isWithinReminderWindow, reminderMessage } from "@/lib/vital-schedule";
import { sendPushToUser } from "@/lib/push-notifications";

export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const activeRounds = DEFAULT_VITAL_ROUNDS.filter((round) => isWithinReminderWindow(now, round));

  if (activeRounds.length === 0) {
    return NextResponse.json({ checked: true, reminders: 0, message: "No active round window" });
  }

  const patients = await prisma.patient.findMany({
    include: {
      vitalSigns: { orderBy: { measuredAt: "desc" }, take: 1 },
      caregivers: { include: { user: { include: { pushDevices: true } } } },
      vitalSchedules: { where: { enabled: true } },
    },
  });

  let remindersSent = 0;
  const details: string[] = [];

  for (const patient of patients) {
    const rounds =
      patient.vitalSchedules.length > 0
        ? patient.vitalSchedules.map((s) => ({ label: s.label, hour: s.hour, minute: s.minute }))
        : DEFAULT_VITAL_ROUNDS;

    for (const round of rounds) {
      if (!activeRounds.some((r) => r.hour === round.hour && r.minute === round.minute)) {
        continue;
      }

      const lastVital = patient.vitalSigns[0];
      const roundStart = new Date(now);
      roundStart.setHours(round.hour, round.minute, 0, 0);

      if (lastVital && lastVital.measuredAt >= roundStart) {
        continue;
      }

      const title = "ถึงรอบบันทึกค่าสถิติร่างกาย";
      const body = reminderMessage(`${patient.firstName} ${patient.lastName}`, round.label);

      await prisma.alert.create({
        data: {
          organizationId: patient.organizationId,
          patientId: patient.id,
          level: "INFO",
          title,
          description: body,
        },
      });

      await prisma.activityLog.create({
        data: {
          organizationId: patient.organizationId,
          patientId: patient.id,
          type: "VITAL_REMINDER",
          title,
          description: body,
        },
      });

      const tokens = patient.caregivers.flatMap((c) => c.user.pushDevices.map((d) => d.token));
      await sendPushToUser(tokens, title, body, {
        patientId: patient.id,
        orgId: patient.organizationId,
        round: round.label,
      });

      remindersSent += 1;
      details.push(`${patient.firstName} — ${round.label}`);
    }
  }

  return NextResponse.json({ checked: true, reminders: remindersSent, details });
}
