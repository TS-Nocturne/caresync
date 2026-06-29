import { NextResponse } from "next/server";
import { runDailyPatientMaintenance } from "@/lib/patient-maintenance";

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

  const result = await runDailyPatientMaintenance();

  return NextResponse.json({
    checked: true,
    ...result,
  });
}
