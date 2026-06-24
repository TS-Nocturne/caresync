import { createHash } from "crypto";

function stablePatientToken(patientId: string): string {
  return `anon-${createHash("sha256").update(patientId).digest("hex").slice(0, 12)}`;
}

export function redactText(text: string): string {
  return text
    .replace(/\b(?:นาย|นาง|น\.ส\.|Mr\.|Mrs\.|Ms\.)\s*[\w\u0E00-\u0E7F]+/g, "[NAME]")
    .replace(/\b\d{13}\b/g, "[NATIONAL_ID]")
    .replace(/\b(?:\+66|0)\d{8,9}\b/g, "[PHONE]")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[EMAIL]");
}

export function anonymizeTrainingRecord(record: {
  patientId?: string;
  vitals?: Record<string, unknown>;
  symptoms?: string[];
  riskLevel?: string;
  medications?: string[];
}) {
  return {
    patient_token: stablePatientToken(record.patientId ?? "unknown"),
    vitals: record.vitals ?? {},
    symptoms: record.symptoms ?? [],
    risk_level: record.riskLevel,
    current_medications: (record.medications ?? []).map((m) => redactText(String(m))),
  };
}

export function anonymizePatientName(firstName: string, lastName: string, patientId: string): string {
  return `Patient ${stablePatientToken(patientId)}`;
}
