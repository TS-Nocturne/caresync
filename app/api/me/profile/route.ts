import { NextResponse } from "next/server";
import { apiError, readJsonBody, sanitizeText } from "@/lib/api-security";
import { requireSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

type ProfileBody = {
  name?: unknown;
  image?: unknown;
};

function normalizeImageUrl(value: unknown) {
  const image = sanitizeText(value, 2000);
  if (!image) return null;

  if (image.startsWith("/uploads/profiles/")) {
    return image;
  }

  try {
    const url = new URL(image);
    if (url.protocol !== "https:") {
      throw new Error("Invalid profile image URL");
    }
    return url.toString();
  } catch {
    throw new Error("Invalid profile image URL");
  }
}

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true },
    });

    if (!user) throw new Error("Not found");
    return NextResponse.json({ data: user });
  } catch (error) {
    return apiError(error, "Failed to fetch profile");
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJsonBody<ProfileBody>(request);
    const name = sanitizeText(body.name, 120);

    if (!name) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        image: normalizeImageUrl(body.image),
      },
      select: { id: true, name: true, email: true, image: true },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    return apiError(error, "Failed to update profile");
  }
}
