"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/app/components/ui/ThemeToggle";
import GoogleSignInButton from "@/app/components/auth/GoogleSignInButton";
import { sanitizeCallbackUrl } from "@/lib/redirects";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"), "/dashboard");
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) {
      router.replace(callbackUrl);
    }
  }, [isPending, session, router, callbackUrl]);

  if (isPending || session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">กำลังเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn.email({
        email,
        password,
        callbackURL: callbackUrl,
      });
      if (result.error) {
        setError(result.error.message || "Failed to login");
        return;
      }
      router.push(callbackUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const signupHref = `/signup${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative px-4 py-20 sm:px-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full p-5 sm:p-8 bg-card rounded-2xl shadow-xl border border-border">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sign in to CareSync</h1>
          <p className="text-sm text-muted-foreground mt-2">บัญชีฟรีสำหรับพยาบาลและครอบครัว — ไม่มีค่าใช้จ่าย</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-600 text-sm">{error}</div>
        )}

        <div className="space-y-4 mb-4">
          <GoogleSignInButton callbackURL={callbackUrl} />
          <GoogleSignInButton provider="line" callbackURL={callbackUrl} />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">หรือใช้อีเมล</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href={signupHref} className="text-primary font-medium hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}
