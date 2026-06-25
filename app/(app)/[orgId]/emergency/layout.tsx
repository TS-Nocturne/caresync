import Navigation from "@/app/components/ui/Navigation";
import { enforcePortalAccess } from "@/lib/portal-guard";

export default async function EmergencyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await enforcePortalAccess(orgId, "family");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-28 md:pt-16">{children}</main>
    </div>
  );
}
