"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import WorkspaceSelector, { type WorkspaceInfo } from "./WorkspaceSelector";

type SessionUserWithConsent = {
  termsAccepted?: boolean;
};

interface WorkspaceResponse {
  redirect?: string;
  multipleWorkspaces?: boolean;
  workspaces?: WorkspaceInfo[];
  error?: string;
}

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if ((session.user as SessionUserWithConsent).termsAccepted === false) {
      router.replace("/consent");
      return;
    }

    let cancelled = false;

    fetch("/api/me/workspace", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return null;
        }
        return res.json() as Promise<WorkspaceResponse>;
      })
      .then((data) => {
        if (cancelled || !data) return;

        // Multiple workspaces → show selector
        if (data.multipleWorkspaces && data.workspaces) {
          setWorkspaces(data.workspaces);
          setLoading(false);
          return;
        }

        // Single workspace → auto-redirect
        if (data.redirect) {
          router.replace(data.redirect);
          return;
        }

        router.replace("/login");
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [isPending, session, router]);

  // Show workspace selector when user has multiple workspaces
  if (workspaces && !loading) {
    return (
      <WorkspaceSelector
        workspaces={workspaces}
        userName={session?.user?.name ?? undefined}
      />
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">กำลังเข้าสู่ workspace...</p>
      </div>
    </div>
  );
}
