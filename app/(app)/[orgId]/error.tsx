"use client";

import { useEffect } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ui/ThemeToggle";

export default function OrgError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Org layout error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="glass-card max-w-md w-full p-8 text-center animate-fade-in shadow-xl">
        <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">ระบบขัดข้องชั่วคราว</h2>
        <p className="text-muted-foreground mb-8">
          เกิดข้อผิดพลาดในการโหลดข้อมูลห้องดูแลผู้สูงอายุ กรุณาลองใหม่อีกครั้ง
          {process.env.NODE_ENV === "development" && (
            <span className="block mt-2 text-xs text-rose-500 text-left bg-rose-50 p-2 rounded break-all">
              {error.message}
            </span>
          )}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => reset()}
            className="w-full px-4 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-sm"
          >
            ลองใหม่อีกครั้ง
          </button>
          <Link
            href="/dashboard"
            className="block w-full px-4 py-3 border border-border bg-card text-foreground font-medium rounded-xl hover:bg-muted transition-colors"
          >
            กลับหน้าหลัก (Dashboard)
          </Link>
        </div>
      </div>
    </div>
  );
}
