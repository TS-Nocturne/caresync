import { prisma } from "./prisma";
import { calculateAndPersistPatientBaseline } from "./patient-baselines";
import { runExpiredAccountPatientRetention } from "./patient-data-retention";

export async function runPatientBaselineMaintenance() {
  const patients = await prisma.patient.findMany({
    select: { id: true, organizationId: true },
  });

  const results: Array<{ patientId: string; ok: boolean; vitalsUsed?: number; error?: string }> = [];

  for (const patient of patients) {
    try {
      const result = await calculateAndPersistPatientBaseline({
        orgId: patient.organizationId,
        patientId: patient.id,
      });
      results.push({ patientId: patient.id, ok: true, vitalsUsed: result.vitalsUsed });
    } catch (error) {
      results.push({
        patientId: patient.id,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    patients: patients.length,
    updated: results.filter((result) => result.ok).length,
    results,
  };
}

export async function runDailyPatientMaintenance() {
  const baselines = await runPatientBaselineMaintenance();
  const retention = await runExpiredAccountPatientRetention();
  return { baselines, retention };
}
