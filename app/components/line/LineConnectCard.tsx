"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

type LineAccountStatus = {
  connected: boolean;
  connectedAt: string | null;
  accountLabel: string | null;
  lineEnabled: boolean;
  addFriendUrl: string | null;
};

type OAuth2SignInClient = {
  signIn: {
    oauth2: (options: { providerId: string; callbackURL: string }) => Promise<unknown>;
  };
};

type LineConnectCardProps = {
  mode?: "card" | "banner" | "compact";
  hideWhenConnected?: boolean;
  title?: string;
  description?: string;
  onConnectedChange?: (connected: boolean) => void;
};

function formatConnectedAt(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LineConnectCard({
  mode = "card",
  hideWhenConnected = false,
  title = "เชื่อมต่อ LINE เพื่อรับการแจ้งเตือนทันที",
  description = "รับแจ้งเตือนค่าความดัน เหตุฉุกเฉิน และข้อความสำคัญจากห้องดูแลตรงถึงมือถือของคุณ",
  onConnectedChange,
}: LineConnectCardProps) {
  const [status, setStatus] = useState<LineAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const onConnectedChangeRef = useRef(onConnectedChange);

  useEffect(() => {
    onConnectedChangeRef.current = onConnectedChange;
  }, [onConnectedChange]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/me/line-account", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "โหลดสถานะ LINE ไม่สำเร็จ");
      setStatus(json.data);
      onConnectedChangeRef.current?.(Boolean(json.data?.connected));
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดสถานะ LINE ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStatus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadStatus]);

  const connectLine = async () => {
    setConnecting(true);
    setError("");
    try {
      await (authClient as OAuth2SignInClient).signIn.oauth2({
        providerId: "line",
        callbackURL: window.location.pathname + window.location.search,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เชื่อมต่อบัญชี LINE ไม่สำเร็จ");
      setConnecting(false);
    }
  };

  const disconnectLine = async () => {
    setDisconnecting(true);
    setError("");
    try {
      const res = await fetch("/api/me/line-account", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ยกเลิกการเชื่อมต่อ LINE ไม่สำเร็จ");
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยกเลิกการเชื่อมต่อ LINE ไม่สำเร็จ");
    } finally {
      setDisconnecting(false);
    }
  };

  if (hideWhenConnected && (loading || status?.connected)) return null;

  const shellClass =
    mode === "banner"
      ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20"
      : mode === "compact"
        ? "rounded-xl border border-border bg-card p-4"
        : "rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm";

  return (
    <section className={shellClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#06C755] text-xs font-black text-white">
              LINE
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">{title}</h2>
              {status?.connected ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  เชื่อมต่อแล้ว{status.accountLabel ? ` (${status.accountLabel})` : ""}
                  {status.connectedAt ? ` · ${formatConnectedAt(status.connectedAt)}` : ""}
                </p>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          {status?.lineEnabled === false && (
            <p className="mt-2 text-sm text-amber-700">
              ยังไม่ได้ตั้งค่า LINE OAuth ในระบบ กรุณาเพิ่ม LINE_CLIENT_ID และ LINE_CLIENT_SECRET ก่อนใช้งาน
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 min-[420px]:flex-row sm:flex-col lg:flex-row">
          {loading ? (
            <div className="h-10 w-36 rounded-xl bg-muted animate-pulse" />
          ) : status?.connected ? (
            <button
              type="button"
              onClick={disconnectLine}
              disabled={disconnecting}
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {disconnecting ? "กำลังยกเลิก..." : "ยกเลิกการเชื่อมต่อ"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={connectLine}
                disabled={connecting || status?.lineEnabled === false}
                className="inline-flex items-center justify-center rounded-xl bg-[#06C755] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#05b84f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connecting ? "กำลังเชื่อมต่อ..." : "เข้าสู่ระบบด้วย LINE"}
              </button>
              {status?.addFriendUrl && (
                <a
                  href={status.addFriendUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  เพิ่มเพื่อน LINE OA
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
