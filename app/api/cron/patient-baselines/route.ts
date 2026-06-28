import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAndPersistPatientBaseline } from "@/lib/patient-baselines";

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

  const patients = await prisma.patient.findMany({
    select: { id: true, organizationId: true },
  });

  const results: Array<{ patientId: string; ok: boolean; vitalsUsed?: number; error?: string }> = [];

  for (const patient of patients) {
    try {
      const result = await calculateAndPersistPatientBaseline({
        orgId: patient.organizationId,
        patientId: patient.id,
      });
      results.push({ patientId: patient.id, ok: true, vitalsUsed: result.vitalsUsed });
    } catch (error) {
      results.push({
        patientId: patient.id,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    checked: true,
    patients: patients.length,
    updated: results.filter((result) => result.ok).length,
    results,
  });
}
