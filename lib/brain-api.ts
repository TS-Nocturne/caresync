export type BrainRiskLevel = "normal" | "warning" | "critical";
export type BrainStatus = "completed" | "waiting_for_human" | "needs_confirmation";

export interface ValidationIssue {
  field: string;
  value?: number | null;
  severity: "error" | "warning";
  message: string;
  suggested_value?: number | null;
}

export interface BrainState {
  patient_id?: string;
  vitals?: Record<string, unknown>;
  symptoms?: string[];
  current_medications?: string[];
  retrieved_medical_context?: string;
  validation_issues?: ValidationIssue[];
  validation_confirmed?: boolean;
  risk_level?: BrainRiskLevel;
  ai_analysis?: string;
  recommended_actions?: string[];
  family_decision?: string | null;
  family_availability?: Array<{
    member_name: string;
    day: number;
    start_hour: number;
    end_hour: number;
    note?: string;
  }>;
  executed_actions?: string[];
  errors?: string[];
}

export interface BrainAssessmentResult {
  thread_id: string;
  status: BrainStatus;
  state: BrainState;
}

export function getBrainBaseUrl() {
  return process.env.FASTAPI_URL ?? "http://127.0.0.1:8000";
}

function parseBrainResponse(raw: string) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function formatBrainErrorDetails(data: unknown, raw: string) {
  if (data && typeof data === "object") {
    const maybeError = data as { detail?: unknown; error?: unknown; message?: unknown };
    const details = maybeError.detail ?? maybeError.error ?? maybeError.message ?? data;
    return typeof details === "string" ? details : JSON.stringify(details);
  }
  return raw || "FastAPI brain request failed";
}

function brainHeaders(init?: RequestInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  new Headers(init?.headers).forEach((value, key) => {
    headers[key] = value;
  });
  if (process.env.BRAIN_INTERNAL_API_KEY) {
    headers["X-Internal-API-Key"] = process.env.BRAIN_INTERNAL_API_KEY;
  }
  return headers;
}

export async function callBrain<T>(path: string, init?: RequestInit, retries = 1, timeoutMs = 8000): Promise<T> {
  const url = `${getBrainBaseUrl()}${path}`;
  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: brainHeaders(init),
        signal: controller.signal,
      });

      clearTimeout(id);

      const raw = await response.text();
      const data = parseBrainResponse(raw);
      if (!response.ok) {
        const details = formatBrainErrorDetails(data, raw);
        console.error("🔥 FastAPI Error Details:", {
          url,
          status: response.status,
          statusText: response.statusText,
          body: details,
        });
        throw new Error(`FastAPI Error ${response.status}: ${details}`);
      }
      return data as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // If it's an abort error or we have retries left, continue
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s before retry
      }
    }
  }

  throw lastError ?? new Error("FastAPI brain request failed after retries");
}
