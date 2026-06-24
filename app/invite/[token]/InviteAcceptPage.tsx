"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import GoogleSignInButton from "@/app/components/auth/GoogleSignInButton";
import ThemeToggle from "@/app/components/ui/ThemeToggle";

interface InvitePreview {
  organizationName: string;
  inviterName: string;
  portalRole: "CAREGIVER" | "FAMILY";
  relationLabel: string | null;
  status: string;
  expiresAt: string;
}

const roleLabels = {
  CAREGIVER: "พยาบาล / ผู้ดูแล",
  FAMILY: "ครอบครัว",
};

export default function InviteAcceptPage({ token }: { token: string }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setPreview(json.data);
        else setError(json.error || "ลิงก์ไม่ถูกต้อง");
      })
      .catch(() => setError("โหลดข้อมูลไม่สำเร็จ"));
  }, [token]);

  const acceptInvite = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ยอมรับคำเชิญไม่สำเร็จ");
      router.replace(json.redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยอมรับคำเชิญไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const callbackUrl = `/invite/${token}`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">💌</div>
          <h1 className="text-2xl font-bold text-foreground">คำเชิญเข้าห้องดูแล</h1>
          {preview && (
            <div className="space-y-4 mt-4">
              <p className="text-base text-foreground leading-relaxed">
                คุณได้รับเชิญให้เข้าร่วมห้อง <strong className="text-primary font-bold">&apos;{preview.organizationName}&apos;</strong><br/>
                โดย <strong className="text-foreground">{preview.inviterName}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                บทบาท: {roleLabels[preview.portalRole]}
              </p>
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm border border-emerald-100">
                ✅ ไม่มีค่าใช้จ่ายสำหรับผู้ถูกเชิญ คุณสามารถสร้างบัญชีเพื่อเข้าใช้งานได้ทันที
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-600 text-sm border border-rose-100">
            {error}
          </div>
        )}

        {preview?.status !== "PENDING" && preview && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm text-center">
            ลิงก์นี้{preview.status === "ACCEPTED" ? " ถูกใช้แล้ว" : " หมดอายุหรือถูกยกเลิก"}
          </div>
        )}

        {isPending ? (
          <p className="text-center text-muted-foreground text-sm">กำลังโหลด...</p>
        ) : !session ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              สร้างบัญชีฟรีเพื่อยืนยันตัวตน (จำเป็นสำหรับ Audit Log และลายเซ็นดิจิทัล)
            </p>
            <GoogleSignInButton callbackURL={callbackUrl} />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">หรือ</span>
              </div>
            </div>
            <Link
              href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="block w-full text-center py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              สมัครสมาชิกฟรี
            </Link>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="block w-full text-center py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              เข้าสู่ระบบเป็น <strong className="text-foreground">{session.user.name}</strong>
            </p>
            <button
              type="button"
              disabled={loading || preview?.status !== "PENDING"}
              onClick={acceptInvite}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? "กำลังเข้าร่วม..." : "ยอมรับคำเชิญและเข้าห้อง"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
