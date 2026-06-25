import { NextResponse } from "next/server";

const SAFE_ERROR_MESSAGES = new Set([
  "Unauthorized",
  "Forbidden",
  "Invalid JSON format",
  "Request body too large",
  "Not found",
  "Billing is not configured",
  "No active Stripe customer found",
  "No active Stripe subscription found",
  "Stripe is not configured",
  "Subscription not found",
  "Subscription expired",
]);

const MAX_JSON_BYTES = 256 * 1024;

function getErrorStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  if (message === "Not found" || message.toLowerCase().includes("not found")) return 404;
  if (message === "Invalid JSON format" || message.startsWith("Invalid ")) return 400;
  if (message === "Request body too large") return 413;
  if (message === "Subscription expired") return 402;
  if (message === "Billing is not configured" || message === "Stripe is not configured") return 503;
  return 500;
}

export function apiError(error: unknown, fallback = "Request failed") {
  const message = error instanceof Error ? error.message : fallback;
  const status = getErrorStatus(message);
  const canExposeMessage =
    SAFE_ERROR_MESSAGES.has(message) || message.startsWith("Invalid ") || status === 404;

  return NextResponse.json(
    {
      error: canExposeMessage ? message : fallback,
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
