import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-security";
import { requireSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireSession();
    const addFriendUrl =
      process.env.LINE_OA_ADD_FRIEND_URL?.trim() ||
      process.env.NEXT_PUBLIC_LINE_OA_ADD_FRIEND_URL?.trim() ||
      null;
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
        accountLabel: account?.accountId ? `LINE ${account.accountId.slice(-6)}` : null,
        lineEnabled: Boolean(process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET),
        addFriendUrl,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch LINE account status");
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        providerId: "line",
      },
    });

    return NextResponse.json({ data: { connected: false } });
  } catch (error) {
    return apiError(error, "Failed to disconnect LINE account");
  }
}
