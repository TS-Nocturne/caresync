import { prisma } from "./prisma";
import { requirePatientAccess } from "./workspace-access";

export async function requireBrainThreadAccess(orgId: string, userId: string, threadId: string) {
  const thread = await prisma.brainThread.findUnique({ where: { threadId } });
  if (!thread || thread.organizationId !== orgId) {
    throw new Error("Not found");
  }

  await requirePatientAccess(orgId, userId, thread.patientId);
  return thread;
}

export async function requireThreadAlertAccess(orgId: string, threadId: string, alertId: string) {
  const alert = await prisma.alert.findFirst({
    where: { id: alertId, organizationId: orgId },
    select: { id: true, patientId: true },
  });
  const thread = await prisma.brainThread.findUnique({
    where: { threadId },
    select: { patientId: true },
  });

  if (!alert || !thread || alert.patientId !== thread.patientId) {
    throw new Error("Forbidden");
  }

  return alert;
}
