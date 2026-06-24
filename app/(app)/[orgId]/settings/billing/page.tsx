import { Suspense } from "react";
import Navigation from "@/app/components/ui/Navigation";
import { enforcePortalAccess } from "@/lib/portal-guard";
import BillingSettingsPage from "./BillingSettingsPage";

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  await enforcePortalAccess(orgId, "settings");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-12 max-w-4xl mx-auto px-4 sm:px-6">
        <Suspense fallback={<div className="text-center text-muted-foreground py-12">กำลังโหลด...</div>}>
          <BillingSettingsPage />
        </Suspense>
      </main>
    </div>
  );
}
