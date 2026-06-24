import { callBrain } from "./brain-api";
import { buildPineconeProfile } from "./patient-registration";
import { prisma } from "./prisma";

export async function syncPatientContextToPinecone(patient: Parameters<typeof buildPineconeProfile>[0]) {
  const profile = buildPineconeProfile(patient);

  try {
    const data = await callBrain<Record<string, unknown>>("/brain/index-patient", {
      method: "POST",
      body: JSON.stringify(profile),
    });
    await prisma.patient.update({
      where: { id: patient.id },
      data: { pineconeSyncStatus: "SUCCESS" },
    });
    return { ok: true, ...data };
  } catch (error) {
    console.warn("[pinecone-sync] failed:", error);
    await prisma.patient.update({
      where: { id: patient.id },
      data: { pineconeSyncStatus: "FAILED" },
    });
    return { ok: false, reason: "backend_request_failed" };
  }
}
