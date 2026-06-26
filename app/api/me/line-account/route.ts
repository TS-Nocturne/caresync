import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-security";
import { requireSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireSession();
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: "line",
      },
      select: {
        accountId: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      data: {
        connected: Boolean(account),
        connectedAt: account?.updatedAt ?? null,
        lineEnabled: Boolean(process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET),
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch LINE account status");
  }
}
