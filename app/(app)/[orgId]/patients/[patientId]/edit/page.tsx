import { enforcePortalAccess } from "@/lib/portal-guard";
import PatientRegistrationWizard from "../../new/PatientRegistrationWizard";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ orgId: string; patientId: string }>;
}) {
  const { orgId, patientId } = await params;
  await enforcePortalAccess(orgId, "dashboard");

  return (
    <div className="min-h-screen bg-background">
      <main className="app-nav-offset pb-12">
        <PatientRegistrationWizard mode="edit" patientId={patientId} />
      </main>
    </div>
  );
}
