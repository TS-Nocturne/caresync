import { enforcePortalAccess } from "@/lib/portal-guard";
import TeamSettingsPage from "./TeamSettingsPage";

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  await enforcePortalAccess(orgId, "settings");

  return (
    <div className="min-h-screen bg-background">
      <main className="app-nav-offset pb-12 max-w-4xl mx-auto px-4 sm:px-6">
        <TeamSettingsPage />
      </main>
    </div>
  );
}
