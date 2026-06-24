"use client";

import { useEffect, useState } from "react";
import { organization, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/app/components/ui/ThemeToggle";

type SessionUserWithConsent = {
  termsAccepted?: boolean;
};

export default function OnboardingPage() {
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session && (session.user as SessionUserWithConsent).termsAccepted === false) {
      router.replace("/consent");
    }
  }, [session, router]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const newOrg = await organization.create({
        name: orgName,
        slug: orgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, ""),
      });

      const orgId = newOrg.data?.id as string;

      await organization.setActive({ organizationId: orgId });

      await fetch("/api/workspace/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      router.push(`/${orgId}/settings/billing`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-xl w-full bg-card rounded-3xl p-10 shadow-2xl border border-border">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-8 text-3xl">
          🏠
        </div>

        <h1 className="text-3xl font-extrabold text-foreground mb-2">สร้างห้องดูแล (Workspace)</h1>
        <p className="text-muted-foreground mb-8">
          คุณคือ <strong className="text-foreground">เจ้าของห้อง (Owner)</strong> — คนเดียวที่ชำระค่าแผนรายเดือน
          พยาบาลและครอบครัวจะถูกเชินฟรีผ่านลิงก์
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateWorkspace} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">ชื่อห้องดูแล</label>
            <input
              type="text"
              required
              placeholder="เช่น ห้องดูแลคุณแม่, Happy Senior Home"
              className="w-full px-5 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-foreground"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !orgName.trim()}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? "Creating..." : "สร้าง Workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
