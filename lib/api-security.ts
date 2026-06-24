import { NextResponse } from "next/server";

const SAFE_ERROR_MESSAGES = new Set([
  "Unauthorized",
  "Forbidden",
  "Invalid JSON format",
  "Request body too large",
  "Not found",
  "Billing is not configured",
  "No active Stripe customer found",
  "Stripe is not configured",
  "Subscription not found",
]);
const MAX_JSON_BYTES = 256 * 1024;

export function apiError(error: unknown, fallback = "Request failed") {
  const message = error instanceof Error ? error.message : fallback;
  const status =
    message === "Unauthorized"
      ? 401
      : message === "Forbidden"
        ? 403
        : message === "Not found" || message.toLowerCase().includes("not found")
          ? 404
          : message === "Invalid JSON format" || message.startsWith("Invalid ")
          ? 400
          : message === "Request body too large"
            ? 413
            : message === "Billing is not configured" || message === "Stripe is not configured"
              ? 503
              : message.includes("แผน") || message.includes("เธเธ")
                ? 402
                : 500;
  return NextResponse.json(
    {
      error:
        SAFE_ERROR_MESSAGES.has(message) ||
        message.startsWith("Invalid ") ||
        status === 402 ||
        status === 404
          ? message
          : fallback,
    },
    { status }
  );
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_JSON_BYTES) {
    throw new Error("Request body too large");
  }

  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("Invalid JSON format");
  }
}

export function sanitizeText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function sanitizeTextList(values: unknown, maxItems = 25, maxLength = 500) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => sanitizeText(value, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}
