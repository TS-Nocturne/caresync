import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { anonymizeTrainingRecord } from "@/lib/anonymize";
import { apiError, readJsonBody } from "@/lib/api-security";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<{ orgId?: string; patientId?: string }>(request);
    const { orgId, patientId } = body as { orgId?: string; patientId?: string };

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const member = await requireOrgMembership(orgId, session.user.id);
    if (member.role !== "owner" && member.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where = patientId
      ? { organizationId: orgId, patientId }
      : { organizationId: orgId };

    const [vitals, symptoms] = await Promise.all([
      prisma.vitalSign.findMany({ where, orderBy: { measuredAt: "desc" }, take: 500 }),
      prisma.symptomLog.findMany({ where, orderBy: { loggedAt: "desc" }, take: 500 }),
    ]);

    const records = vitals.map((v) =>
      anonymizeTrainingRecord({
        patientId: v.patientId,
        vitals: {
          systolic: v.systolic,
          diastolic: v.diastolic,
          temperature_c: v.temperature,
          heart_rate: v.heartRate,
          spo2: v.oxygenSat,
        },
      })
    );

    for (const s of symptoms) {
      records.push(
        anonymizeTrainingRecord({
          patientId: s.patientId,
          symptoms: [s.symptom],
        })
      );
    }

    return NextResponse.json({ count: records.length, records });
  } catch (error) {
    return apiError(error, "Export failed");
  }
}
