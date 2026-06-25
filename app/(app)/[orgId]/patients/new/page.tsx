import Navigation from "@/app/components/ui/Navigation";
import { enforcePortalAccess } from "@/lib/portal-guard";
import PatientRegistrationWizard from "./PatientRegistrationWizard";

export default async function NewPatientPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  await enforcePortalAccess(orgId, "dashboard");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="app-nav-offset pb-12">
        <PatientRegistrationWizard />
      </main>
    </div>
  );
}
