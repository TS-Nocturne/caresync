import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { requirePortalAccess } from "@/lib/workspace-access";

type GuardRoute = "caregiver" | "family" | "alert" | "dashboard" | "settings";

export async function enforcePortalAccess(orgId: string, route: GuardRoute) {
  const session = await getSession();
  if (!session) redirect(`/login?callbackUrl=/${orgId}/${route === "settings" ? "settings/team" : route}`);

  try {
    await requirePortalAccess(orgId, session.user.id, route);
  } catch {
    const { getPortalAccess } = await import("@/lib/workspace-access");
    const access = await getPortalAccess(orgId, session.user.id);
    redirect(access?.homePath ?? "/dashboard");
  }
}
