"use client";

import { Suspense, useEffect, useState } from "react";
import { organization, useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import ThemeToggle from "@/app/components/ui/ThemeToggle";

type SessionUserWithConsent = {
  termsAccepted?: boolean;
};

interface WorkspaceLookupResponse {
  redirect?: string;
  multipleWorkspaces?: boolean;
  workspaces?: Array<{ isDeleted?: boolean }>;
}

const FALLBACK_WORKSPACE_SLUG = "care-workspace";

function randomSlugSuffix() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0].toString(36).slice(0, 6);
  }

  return Math.random().toString(36).slice(2, 8);
}

function createWorkspaceSlug(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return `${base || FALLBACK_WORKSPACE_SLUG}-${randomSlugSuffix()}`;
}

function OnboardingPageContent() {
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingWorkspace, setCheckingWorkspace] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;
  const termsAccepted = (session?.user as SessionUserWithConsent | undefined)?.termsAccepted;
  const forceCreate = searchParams.get("create") === "1";

  useEffect(() => {
    if (isPending) return;

    if (!userId) {
      router.replace("/login");
      return;
    }

    if (termsAccepted === false) {
      router.replace("/consent");
      return;
    }

    let cancelled = false;

    fetch("/api/me/workspace", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as WorkspaceLookupResponse;
      })
      .then((data) => {
        if (cancelled) return;

        if (!forceCreate && data?.redirect && data.redirect !== "/onboarding") {
          router.replace(data.redirect);
          return;
        }

        if (!forceCreate && data?.multipleWorkspaces && data.workspaces?.some((workspace) => !workspace.isDeleted)) {
          router.replace("/dashboard");
          return;
        }

        setCheckingWorkspace(false);
      })
      .catch(() => {
        if (!cancelled) setCheckingWorkspace(false);
      });

    return () => {
      cancelled = true;
    };
  }, [forceCreate, isPending, termsAccepted, userId, router]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const newOrg = await organization.create({
        name: orgName,
        slug: createWorkspaceSlug(orgName),
      });

      if (newOrg.error) {
        throw new Error(newOrg.error.message || "Failed to create workspace");
      }

      const orgId = newOrg.data?.id;
      if (!orgId) {
        throw new Error("Failed to create workspace");
      }

      const activeOrg = await organization.setActive({ organizationId: orgId });
      if (activeOrg.error) {
        throw new Error(activeOrg.error.message || "Failed to activate workspace");
      }

      const setupResponse = await fetch("/api/workspace/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (!setupResponse.ok) {
        const body = await setupResponse.json().catch(() => null);
        throw new Error(body?.error || "Failed to setup workspace");
      }

      router.push(`/${orgId}/settings/billing`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  if (isPending || checkingWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">กำลังตรวจสอบห้องของคุณ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20 sm:px-6 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-xl w-full bg-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 shadow-2xl border border-border">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 sm:mb-8 text-2xl sm:text-3xl">
          🏠
        </div>

        <h1 className="text-3xl font-extrabold text-foreground mb-2">
          {forceCreate ? "เพิ่มห้องดูแลใหม่" : "สร้างห้องดูแล (Workspace)"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 leading-7">
          คุณคือ <strong className="text-foreground">เจ้าของห้อง (Owner)</strong> — คนเดียวที่ชำระค่าแผนรายเดือน
          ผู้ดูแลและครอบครัวจะถูกเชิญฟรีผ่านลิงก์
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateWorkspace} className="space-y-5 sm:space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">ชื่อห้องดูแล</label>
            <input
              type="text"
              required
              placeholder="เช่น ห้องดูแลคุณแม่, Happy Senior Home"
              className="w-full px-4 sm:px-5 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-foreground"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !orgName.trim()}
            className="w-full py-3.5 sm:py-4 bg-primary text-primary-foreground rounded-xl font-bold text-base sm:text-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? "Creating..." : forceCreate ? "เพิ่มห้องใหม่" : "สร้าง Workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
          </div>
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}
