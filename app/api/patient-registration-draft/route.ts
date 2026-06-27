import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/auth-server";
import { apiError, readJsonBody } from "@/lib/api-security";

interface DraftPayload {
  orgId?: string;
  currentStep?: number;
  data?: unknown;
}

async function requireOwnerOrAdmin(orgId: string, userId: string) {
  const member = await requireOrgMembership(orgId, userId);
  if (member.role !== "owner" && member.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function parseStep(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) return 1;
  return Math.min(Math.max(value, 1), 6);
}

function parseDraftData(value: unknown): Prisma.InputJsonValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid draft data");
  }
  return value as Prisma.InputJsonValue;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    await requireOwnerOrAdmin(orgId, session.user.id);

    const draft = await prisma.patientRegistrationDraft.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: session.user.id,
        },
      },
      select: {
        id: true,
        currentStep: true,
        data: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: draft });
  } catch (error) {
    return apiError(error, "Failed to fetch patient registration draft");
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<DraftPayload>(request);

    if (!body.orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    await requireOwnerOrAdmin(body.orgId, session.user.id);

    const currentStep = parseStep(body.currentStep);
    const data = parseDraftData(body.data);

    const draft = await prisma.patientRegistrationDraft.upsert({
      where: {
        organizationId_userId: {
          organizationId: body.orgId,
          userId: session.user.id,
        },
      },
      create: {
        organizationId: body.orgId,
        userId: session.user.id,
        currentStep,
        data,
      },
      update: {
        currentStep,
        data,
      },
      select: {
        id: true,
        currentStep: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: draft });
  } catch (error) {
    return apiError(error, "Failed to save patient registration draft");
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    await requireOwnerOrAdmin(orgId, session.user.id);

    await prisma.patientRegistrationDraft.deleteMany({
      where: {
        organizationId: orgId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return apiError(error, "Failed to delete patient registration draft");
  }
}
