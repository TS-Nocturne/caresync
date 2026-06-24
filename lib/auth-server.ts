import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./prisma";

export { getDefaultOrgRedirect } from "./workspace-access";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireOrgMembership(orgId: string, userId: string) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  if (!member) {
    throw new Error("Forbidden");
  }
  return member;
}
