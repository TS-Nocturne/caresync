import { getSession } from "@/lib/auth-server";
import { getPortalAccess } from "@/lib/workspace-access";
import { redirect } from "next/navigation";
import Calendar from "@/app/components/calendar/Calendar";

export default async function CalendarPage(props: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await props.params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const access = await getPortalAccess(orgId, session.user.id);
  if (!access) {
    redirect("/dashboard");
  }

  const isOwnerOrAdmin = access.orgRole === "owner" || access.orgRole === "admin";

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pb-12 app-nav-offset">
        <Calendar 
          orgId={orgId} 
          currentUserId={session.user.id} 
          portalRole={access.isFamily ? "FAMILY" : access.isCaregiver ? "CAREGIVER" : null} 
          isOwnerOrAdmin={isOwnerOrAdmin} 
        />
      </main>
    </div>
  );
}
