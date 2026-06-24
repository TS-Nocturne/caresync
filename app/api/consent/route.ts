import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-security";

export async function POST() {
  try {
    const session = await requireSession();

    // Update termsAccepted to true
    await prisma.user.update({
      where: { id: session.user.id },
      data: { termsAccepted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to accept consent");
  }
}
