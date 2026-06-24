import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMembership, requireSession } from "@/lib/auth-server";
import { apiError } from "@/lib/api-security";

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

    const familyLink = patientId
      ? await prisma.patientFamily.findUnique({
          where: { patientId_userId: { patientId, userId: session.user.id } },
        })
      : await prisma.patientFamily.findFirst({
          where: {
            userId: session.user.id,
            patient: { organizationId: orgId },
          },
        });

    const primaryMember = await prisma.patientFamily.findFirst({
      where: {
        isPrimary: true,
        patient: { organizationId: orgId, ...(patientId ? { id: patientId } : {}) },
      },
      include: { user: { select: { name: true } } },
    });

    const memberRecord = await prisma.member.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    });

    const isCaregiver = Boolean(
      patientId
        ? await prisma.patientCaregiver.findUnique({
            where: { patientId_userId: { patientId, userId: session.user.id } },
          })
        : await prisma.patientCaregiver.findFirst({
            where: { userId: session.user.id, patient: { organizationId: orgId } },
          })
    );

    const isPrimaryDecisionMaker = familyLink?.isPrimary ?? isCaregiver ?? memberRecord?.role === "owner";

    return NextResponse.json({
      isPrimaryDecisionMaker,
      isFamilyMember: Boolean(familyLink),
      primaryMemberName: primaryMember?.user.name ?? "Primary decision maker",
      relation: familyLink?.relation ?? null,
    });
  } catch (error) {
    return apiError(error, "Failed to fetch family role");
  }
}
