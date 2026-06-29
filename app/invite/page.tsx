"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/app/components/ui/ThemeToggle";
import { formatInviteCodeInput, isValidInviteCodeInput } from "@/lib/invite-code";

export default function InviteCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const submitCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formatted = formatInviteCodeInput(code);

    if (!isValidInviteCodeInput(formatted)) {
      setError("กรุณากรอกรหัสเชิญให้ครบ");
      return;
    }

    router.push(`/invite/${encodeURIComponent(formatted)}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="text-4xl mb-3">#</div>
          <h1 className="text-2xl font-bold text-foreground">เข้าร่วมด้วยรหัสเชิญ</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            กรอกรหัสที่ได้รับจากเจ้าของห้อง เช่น CMQ-8NKY
          </p>
        </div>

        <form onSubmit={submitCode} className="space-y-4">
          <div>
            <label htmlFor="invite-code" className="mb-2 block text-sm font-medium text-foreground">
              รหัสเชิญ
            </label>
            <input
              id="invite-code"
              value={code}
              onChange={(event) => {
                setError("");
                setCode(formatInviteCodeInput(event.target.value));
              }}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="CMQ-8NKY"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-mono text-lg font-semibold tracking-widest text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-colors hover:bg-primary-dark"
          >
            ตรวจสอบคำเชิญ
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground hover:underline">
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    </div>
  );
}
