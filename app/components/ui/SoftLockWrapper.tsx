"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface SoftLockWrapperProps {
  children: ReactNode;
  isGracePeriod: boolean;
  isReadOnly: boolean;
  graceHoursRemaining: number;
  orgId: string;
  orgName: string;
  isOwner: boolean;
  lockReason?: "not_subscribed" | "expired";
}

export default function SoftLockWrapper({
  children,
  isGracePeriod,
  isReadOnly,
  graceHoursRemaining,
  orgId,
  orgName,
  isOwner,
  lockReason = "expired",
}: SoftLockWrapperProps) {
  const pathname = usePathname();
  const isNotSubscribed = isReadOnly && lockReason === "not_subscribed";

  const isExemptRoute =
    pathname.endsWith("/settings/billing") || pathname.endsWith("/settings/team");

  if (!isGracePeriod && !isReadOnly) {
    return <>{children}</>;
  }

  if (isExemptRoute) {
    return <>{children}</>;
  }

  if (isNotSubscribed) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none select-none blur-[3px] brightness-95">
          {children}
        </div>

        <div className="fixed inset-0 z-40 bg-background/35 backdrop-blur-[1px]" />

        <div className="fixed inset-x-0 top-24 z-50 flex justify-center px-4 sm:top-28">
          <div className="w-full max-w-lg rounded-2xl border border-white/30 bg-background/85 p-6 text-center shadow-2xl backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/85">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 0h10.5A2.25 2.25 0 0 1 19.5 12.75v6A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75v-6A2.25 2.25 0 0 1 6.75 10.5Z" />
              </svg>
            </div>

            <p className="text-xs font-bold uppercase tracking-wide text-primary">CareSync Pro</p>
            <h2 className="mt-2 text-xl font-bold text-foreground">
              ปลดล็อกการบันทึกข้อมูลผู้สูงอายุ
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              เริ่มทดลองใช้ฟรี 14 วันเพื่อใช้งานการบันทึกค่าสถิติร่างกาย ความไม่สบายตัว กิจวัตรประจำวัน ข้อสังเกตเพิ่มเติม และการแจ้งเตือนแบบครบชุด
            </p>

            <div className="mt-5 grid gap-2 text-left text-sm text-foreground">
              <div className="rounded-xl border border-border bg-card/70 px-4 py-3">
                บันทึกข้อมูลรายวันและตรวจความผิดปกติได้ทันที
              </div>
              <div className="rounded-xl border border-border bg-card/70 px-4 py-3">
                ใช้ข้อมูลประกอบการดูแลและแจ้งเตือนครอบครัว
              </div>
              <div className="rounded-xl border border-border bg-card/70 px-4 py-3">
                จัดการผู้ดูแล กิจวัตรประจำวัน และข้อมูลสุขภาพในที่เดียว
              </div>
            </div>

            {isOwner ? (
              <Link
                href={`/${orgId}/settings/billing`}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-primary-dark"
              >
                เริ่มทดลองใช้ฟรี 14 วันเพื่อปลดล็อก
              </Link>
            ) : (
              <div className="mt-6 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
                กรุณาติดต่อเจ้าของห้องเพื่อเริ่มแพ็กเกจ Pro
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen ${isReadOnly ? "read-only-mode" : ""}`}>
      {isReadOnly && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .read-only-mode button[type="submit"],
              .read-only-mode a[href*="/new"],
              .read-only-mode [data-write-action="true"] {
                display: none !important;
              }
            `,
          }}
        />
      )}

      <div className="sticky top-0 z-50 w-full shadow-md">
        {isGracePeriod && (
          <div className="bg-rose-500 text-white px-4 py-3 text-center sm:text-left flex flex-col sm:flex-row items-center justify-center gap-3 text-sm font-medium">
            <span>
              ระบบกำลังจะหยุดรับข้อมูลใหม่ในอีก {graceHoursRemaining} ชั่วโมง โปรดต่ออายุการใช้งานห้อง &apos;{orgName}&apos;
            </span>
            {isOwner && (
              <Link
                href={`/${orgId}/settings/billing`}
                className="bg-white text-rose-600 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-rose-50 transition-colors whitespace-nowrap"
              >
                ต่ออายุทันที
              </Link>
            )}
          </div>
        )}

        {isReadOnly && (
          <div className="bg-gray-800 text-white px-4 py-3 text-center sm:text-left flex flex-col sm:flex-row items-center justify-center gap-3 text-sm font-medium">
            <span>
              {isNotSubscribed
                ? "เริ่มต้นใช้ CareSync Pro ฟรี 14 วันเพื่อเริ่มบันทึกข้อมูลและใช้งานฟีเจอร์ทั้งหมด"
                : "โหมดดูข้อมูลย้อนหลัง (Read-Only) - ไม่สามารถบันทึกข้อมูลใหม่ได้ โปรดต่ออายุการใช้งาน"}
            </span>
            {isOwner ? (
              <Link
                href={`/${orgId}/settings/billing`}
                className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-primary-dark transition-colors whitespace-nowrap"
              >
                {isNotSubscribed ? "ทดลองใช้ฟรี" : "ต่ออายุทันที"}
              </Link>
            ) : (
              <span className="opacity-75 text-xs">(กรุณาติดต่อเจ้าของห้อง)</span>
            )}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
