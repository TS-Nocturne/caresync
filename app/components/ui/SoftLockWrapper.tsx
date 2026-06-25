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

  return (
    <div className={`relative min-h-screen ${isReadOnly ? "read-only-mode" : ""}`}>
      {isReadOnly && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .read-only-mode button[type="submit"],
              .read-only-mode a[href*="/new"],
              .read-only-mode button:not(.nav-button) {
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
                ? "ห้องนี้ยังไม่ได้เริ่มแพ็กเกจ ทดลองใช้งานฟรี 14 วันเพื่อเริ่มบันทึกข้อมูลและใช้งานฟีเจอร์ทั้งหมด"
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
