import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-security";
import { requireSession } from "@/lib/auth-server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Invalid profile image file" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Invalid profile image size" }, { status: 400 });
    }

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Invalid profile image type" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
    await mkdir(uploadDir, { recursive: true });

    const filename = `${session.user.id}-${randomUUID()}.${extension}`;
    await writeFile(path.join(uploadDir, filename), bytes);

    return NextResponse.json({
      data: {
        image: `/uploads/profiles/${filename}`,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to upload profile image");
  }
}
