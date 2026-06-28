import { NextResponse } from "next/server";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { apiError, readJsonBody } from "@/lib/api-security";
import { calculateAndPersistPatientBaseline } from "@/lib/patient-baselines";
import { requirePatientAccess } from "@/lib/workspace-access";

type BaselineBody = {
  orgId?: string;
  patientId?: string;
  k?: number;
};

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<BaselineBody>(request);

    if (!body.orgId || !body.patientId) {
      return NextResponse.json({ error: "orgId and patientId are required" }, { status: 400 });
    }

    const member = await requireOrgMembership(body.orgId, session.user.id);
    if (!["owner", "admin", "member"].includes(member.role)) {
      throw new Error("Forbidden");
    }
    await requirePatientAccess(body.orgId, session.user.id, body.patientId);

    const data = await calculateAndPersistPatientBaseline({
      orgId: body.orgId,
      patientId: body.patientId,
      k: body.k ?? 1.5,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error, "Failed to calculate patient baseline");
  }
}
