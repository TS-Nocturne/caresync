"use client";

import { useEffect, useState } from "react";
import { buildLiffDeepLink, isLineInAppBrowser } from "@/lib/line-liff";

type OpenInLineBannerProps = {
  orgId?: string;
  patientId?: string | null;
  mode?: "caregiver" | "family";
  variant?: "banner" | "fab";
};

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export default function OpenInLineBanner({
  orgId,
  patientId,
  mode = "caregiver",
  variant = "banner",
}: OpenInLineBannerProps) {
  const [visible, setVisible] = useState(false);
  const deepLink = buildLiffDeepLink({ mode, orgId, patientId: patientId ?? undefined });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setVisible(Boolean(deepLink && isMobileViewport() && !isLineInAppBrowser()));
    }, 0);

    return () => window.clearTimeout(id);
  }, [deepLink]);

  if (!visible || !deepLink) return null;

  if (variant === "fab") {
    return (
      <a
        href={deepLink}
        className="fixed bottom-24 right-4 z-40 inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-[#06C755] px-4 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-900/20 md:hidden"
      >
        <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-black">LINE</span>
        เปิดใน LINE
      </a>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm md:hidden">
      <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <div>
          <p className="text-sm font-bold">กรอกข้อมูลไวขึ้น ไม่ต้องล็อกอินบ่อย</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800/80">
            เปิดฟอร์มผ่าน LINE เพื่อเข้าใช้งานแบบ LIFF บนมือถือ
          </p>
        </div>
        <a
          href={deepLink}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#06C755] px-4 py-2.5 text-sm font-bold text-white"
        >
          เปิดแอปใน LINE
        </a>
      </div>
    </section>
  );
}
