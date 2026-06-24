"use client";

import { useState } from "react";
import Logo from "@/app/components/ui/Logo";
import { useLineLiff } from "@/app/hooks/useLineLiff";

function StatusPill({ tone, children }: { tone: "ok" | "warn" | "error"; children: React.ReactNode }) {
  const classes = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900",
    warn: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900",
    error: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${classes[tone]}`}>
      {children}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[65%] truncate text-right text-sm font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

export default function LiffPageClient() {
  const liff = useLineLiff();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const statusTone =
    liff.status === "ready" ? "ok" : liff.status === "error" ? "error" : "warn";

  const sendTestMessage = async () => {
    setSending(true);
    setMessage("");

    try {
      await liff.sendTextMessage("CareFlow LIFF เชื่อมต่อสำเร็จ");
      setMessage("ส่งข้อความทดสอบแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <Logo className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">CareFlow LIFF</h1>
              <p className="text-sm text-muted-foreground">LINE Front-end Framework connection check</p>
            </div>
          </div>
          <StatusPill tone={statusTone}>{liff.status}</StatusPill>
        </header>

        {liff.status === "missing-config" && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            ตั้งค่า <span className="font-semibold">NEXT_PUBLIC_LINE_LIFF_ID</span> ก่อนเปิดหน้านี้ใน LINE LIFF
          </section>
        )}

        {liff.error && (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {liff.error}
          </section>
        )}

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-2 text-base font-semibold">Runtime</h2>
          <InfoRow label="LIFF ID" value={liff.liffId ? "configured" : "missing"} />
          <InfoRow label="In LINE app" value={liff.isInClient ? "yes" : "no"} />
          <InfoRow label="Logged in" value={liff.isLoggedIn ? "yes" : "no"} />
          <InfoRow label="OS" value={liff.os ?? ""} />
          <InfoRow label="LINE version" value={liff.lineVersion ?? ""} />
          <InfoRow label="LIFF SDK" value={liff.liffVersion ?? ""} />
          <InfoRow label="Context" value={liff.contextType ?? ""} />
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-2 text-base font-semibold">Profile</h2>
          <InfoRow label="Display name" value={liff.profile?.displayName ?? ""} />
          <InfoRow label="User ID" value={liff.profile?.userId ?? ""} />
          <InfoRow label="Status" value={liff.profile?.statusMessage ?? ""} />
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={liff.login}
            disabled={liff.isLoggedIn || liff.status === "missing-config"}
            className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Login
          </button>
          <button
            type="button"
            onClick={sendTestMessage}
            disabled={sending || !liff.isInClient || liff.status !== "ready"}
            className="rounded-lg border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send test"}
          </button>
          <button
            type="button"
            onClick={liff.closeWindow}
            disabled={!liff.isInClient}
            className="rounded-lg border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close
          </button>
        </div>

        {liff.isLoggedIn && (
          <button
            type="button"
            onClick={liff.logout}
            className="self-start text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Logout
          </button>
        )}

        {message && (
          <p className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </main>
  );
}
