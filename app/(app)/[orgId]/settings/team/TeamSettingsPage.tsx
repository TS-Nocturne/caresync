"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface MemberRow {
  userId: string;
  name: string;
  email: string;
  orgRole: string;
  roleLabel: string;
  isCaregiver: boolean;
  isFamily: boolean;
}

interface InviteRow {
  id: string;
  url: string;
  portalRole: "CAREGIVER" | "FAMILY";
  status: string;
  expiresAt: string;
  isExpired: boolean;
}

export default function TeamSettingsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [plan, setPlan] = useState("FREE");
  const [memberCount, setMemberCount] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creating, setCreating] = useState<"CAREGIVER" | "FAMILY" | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [memberToRevoke, setMemberToRevoke] = useState<MemberRow | null>(null);
  const [revokingMemberId, setRevokingMemberId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/workspace/members?orgId=${orgId}`, { cache: "no-store" }),
        fetch(`/api/workspace/invites?orgId=${orgId}`, { cache: "no-store" }),
      ]);
      const membersJson = await membersRes.json();
      const invitesJson = await invitesRes.json();
      if (!membersRes.ok) throw new Error(membersJson.error);
      if (!invitesRes.ok) throw new Error(invitesJson.error);
      setError("");
      setMembers(membersJson.data ?? []);
      setInvites(invitesJson.data ?? []);
      setPlan(invitesJson.plan ?? "FREE");
      setMemberCount(invitesJson.memberCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
    }
  }, [orgId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const createInvite = async (portalRole: "CAREGIVER" | "FAMILY") => {
    setCreating(portalRole);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/workspace/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, portalRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSuccess(`สร้างลิงก์เชิญ${portalRole === "CAREGIVER" ? "พยาบาล" : "ครอบครัว"}แล้ว — คัดลอกส่งทางไลน์ได้เลย`);
      await navigator.clipboard.writeText(json.data.url);
      setCopied(json.data.url);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างลิงก์ไม่สำเร็จ");
    } finally {
      setCreating(null);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    const res = await fetch(`/api/workspace/invites?orgId=${orgId}&inviteId=${inviteId}`, {
      method: "DELETE",
    });
    if (res.ok) load();
  };

  const revokeMember = async () => {
    if (!memberToRevoke) return;

    setRevokingMemberId(memberToRevoke.userId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/workspace/members?orgId=${orgId}&userId=${memberToRevoke.userId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ลบไม่สำเร็จ");
      setSuccess(`เพิกถอนสิทธิ์ของ ${memberToRevoke.name} แล้ว`);
      setMemberToRevoke(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setRevokingMemberId(null);
    }
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <main className="pt-24 pb-12 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">จัดการทีม & ลิงก์เชิญ</h1>
          <p className="text-sm text-muted-foreground mt-1">
            เฉพาะเจ้าของห้องเท่านั้นที่เชิญและเพิกถอนสิทธิ์ — พยาบาลและครอบครัวสมัครฟรี ไม่ถูกเก็บเงิน
          </p>
          <div className="flex gap-3 mt-4 text-sm">
            <Link href={`/${orgId}/dashboard`} className="text-muted-foreground hover:underline">
              ← กลับ Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-600 text-sm border border-rose-100">
            {error}
            {error.includes("อัปเกรด") && (
              <Link href={`/${orgId}/settings/billing`} className="block mt-2 font-medium underline">
                ไปอัปเกรดแผน →
              </Link>
            )}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm border border-emerald-100">
            {success}
          </div>
        )}

        <Link
          href={`/${orgId}/settings/billing`}
          className="bg-card p-5 rounded-2xl border border-border hover:border-primary/40 transition-colors flex items-center gap-4 mb-6"
        >
          <span className="text-3xl">💳</span>
          <div>
            <h3 className="font-bold text-foreground">แผน & การชำระเงิน: {plan} ({memberCount} สมาชิก)</h3>
            <p className="text-sm text-muted-foreground">เฉพาะแอดมิน (เจ้าของแพลน) — อัปเกรดเพื่อเพิ่มสิทธิ์การเชิญสมาชิก</p>
          </div>
        </Link>

        <section className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">สร้างลิงก์เชิญ (Invite Link)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            ส่งลิงก์ทางไลน์ — ผู้รับเชิญสร้างบัญชีฟรีแล้วเข้าเฉพาะหน้าที่กำหนด
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={creating !== null}
              onClick={() => createInvite("CAREGIVER")}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {creating === "CAREGIVER" ? "..." : "👨‍⚕️ เชิญพยาบาล/ผู้ดูแล"}
            </button>
            <button
              type="button"
              disabled={creating !== null}
              onClick={() => createInvite("FAMILY")}
              className="px-5 py-2.5 rounded-xl border border-border font-medium hover:bg-muted disabled:opacity-50"
            >
              {creating === "FAMILY" ? "..." : "👨‍👩‍👧‍👦 เชิญครอบครัว"}
            </button>
          </div>
        </section>

        {invites.length > 0 && (
          <section className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">ลิงก์ที่สร้างแล้ว</h2>
            <div className="space-y-3">
              {invites.slice(0, 10).map((inv) => (
                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {inv.portalRole === "CAREGIVER" ? "พยาบาล" : "ครอบครัว"} — {inv.status}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{inv.url}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {inv.status === "PENDING" && !inv.isExpired && (
                      <>
                        <button
                          type="button"
                          onClick={() => copyLink(inv.url)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground"
                        >
                          {copied === inv.url ? "คัดลอกแล้ว!" : "คัดลอก"}
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeInvite(inv.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
                        >
                          ยกเลิก
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">สมาชิกในห้อง</h2>
          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border"
              >
                <div>
                  <p className="font-medium text-sm">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                  <p className="text-xs text-primary mt-1">{m.roleLabel}</p>
                </div>
                {m.orgRole !== "owner" && (
                  <button
                    type="button"
                    onClick={() => setMemberToRevoke(m)}
                    disabled={revokingMemberId !== null}
                    className="text-xs px-3 py-1.5 rounded-lg text-rose-600 border border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                  >
                    {revokingMemberId === m.userId ? "กำลังเพิกถอน..." : "เพิกถอนสิทธิ์"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {memberToRevoke && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-member-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-in">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                !
              </div>
              <div>
                <h2 id="revoke-member-title" className="text-lg font-bold text-foreground">
                  เพิกถอนสิทธิ์ผู้ดูแล?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  คุณกำลังจะเพิกถอนสิทธิ์ของ{" "}
                  <span className="font-semibold text-foreground">{memberToRevoke.name}</span>{" "}
                  บัญชีนี้จะถูกตัดออกจากระบบและไม่สามารถเข้าถึงประวัติสุขภาพของคนไข้ในห้องนี้ได้อีก คุณแน่ใจหรือไม่?
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setMemberToRevoke(null)}
                disabled={revokingMemberId !== null}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={revokeMember}
                disabled={revokingMemberId !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {revokingMemberId !== null && (
                  <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                )}
                เพิกถอนสิทธิ์
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
