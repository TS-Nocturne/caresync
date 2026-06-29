import { enforcePortalAccess } from "@/lib/portal-guard";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PatientRegistrationWizard from "./PatientRegistrationWizard";

export default async function NewPatientPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  await enforcePortalAccess(orgId, "dashboard");
  const existingPatient = await prisma.patient.findFirst({
    where: { organizationId: orgId },
    select: { id: true },
  });

  if (existingPatient) {
    redirect(`/${orgId}/dashboard?patientLimit=1`);
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="app-nav-offset pb-12">
        <PatientRegistrationWizard />
      </main>
    </div>
  );
}
