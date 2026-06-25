"use client";

import { Suspense, useState } from "react";
import { signUp } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/app/components/ui/ThemeToggle";
import GoogleSignInButton from "@/app/components/auth/GoogleSignInButton";
import { sanitizeCallbackUrl } from "@/lib/redirects";

function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"), "/onboarding");
  const isInviteFlow = callbackUrl.startsWith("/invite/");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signUp.email({
        email,
        password,
        name,
        callbackURL: callbackUrl,
      });
      if (result.error) {
        setError(result.error.message || "Failed to sign up");
        return;
      }
      router.push(callbackUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const loginHref = `/login${callbackUrl !== "/onboarding" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full p-8 bg-card rounded-2xl shadow-xl border border-border">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">สมัครสมาชิกฟรี</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isInviteFlow
              ? "สร้างบัญชีเพื่อยอมรับคำเชิญ — ไม่มีค่าใช้จ่าย"
              : "สร้าง Workspace ใหม่ — เฉพาะเจ้าของห้องที่ชำระเงิน"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-600 text-sm">{error}</div>
        )}

        <div className="space-y-4 mb-4">
          <GoogleSignInButton callbackURL={callbackUrl} label="Sign up with Google" />
          <GoogleSignInButton provider="line" callbackURL={callbackUrl} label="Sign up with LINE" />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">หรือใช้อีเมล</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-4 pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                className="mt-1 w-4 h-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                ฉันได้อ่านและยอมรับ <Link href="/terms-of-service" className="text-primary hover:underline" target="_blank">ข้อกำหนดการใช้งาน (Terms of Service)</Link> และ <Link href="/privacy-policy" className="text-primary hover:underline" target="_blank">นโยบายความเป็นส่วนตัว (Privacy Policy)</Link>
              </span>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                (ทางเลือก) ฉันยินยอมรับข่าวสารและโปรโมชันพิเศษจาก CareSync
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Creating account..." : "Sign up free"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={loginHref} className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignUpForm />
    </Suspense>
  );
}
