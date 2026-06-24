"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type LineLiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

type LineLiffStatus = "idle" | "loading" | "ready" | "missing-config" | "error";

type LineLiffState = {
  status: LineLiffStatus;
  error: string | null;
  isInClient: boolean;
  isLoggedIn: boolean;
  os: string | null;
  lineVersion: string | null;
  liffVersion: string | null;
  contextType: string | null;
  profile: LineLiffProfile | null;
};

const initialState: LineLiffState = {
  status: "idle",
  error: null,
  isInClient: false,
  isLoggedIn: false,
  os: null,
  lineVersion: null,
  liffVersion: null,
  contextType: null,
  profile: null,
};

export function useLineLiff({ autoLogin = true }: { autoLogin?: boolean } = {}) {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID ?? "";
  const [state, setState] = useState<LineLiffState>(initialState);

  useEffect(() => {
    let active = true;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        if (!liffId) {
          if (active) {
            setState({ ...initialState, status: "missing-config" });
          }
          return;
        }

        if (active) {
          setState((current) => ({ ...current, status: "loading", error: null }));
        }

        try {
          const { default: liff } = await import("@line/liff");

          await liff.init({
            liffId,
            withLoginOnExternalBrowser: autoLogin,
          });

          const isLoggedIn = liff.isLoggedIn();
          const context = liff.getContext() as { type?: string } | null;
          let profile: LineLiffProfile | null = null;

          if (isLoggedIn) {
            profile = await liff.getProfile();
          }

          if (active) {
            setState({
              status: "ready",
              error: null,
              isInClient: liff.isInClient(),
              isLoggedIn,
              os: liff.getOS() ?? null,
              lineVersion: liff.getLineVersion() ?? null,
              liffVersion: liff.getVersion(),
              contextType: context?.type ?? null,
              profile,
            });
          }
        } catch (error) {
          if (active) {
            setState({
              ...initialState,
              status: "error",
              error: error instanceof Error ? error.message : "LIFF initialization failed",
            });
          }
        }
      })();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [autoLogin, liffId]);

  const login = useCallback(async () => {
    const { default: liff } = await import("@line/liff");
    liff.login({ redirectUri: window.location.href });
  }, []);

  const logout = useCallback(async () => {
    const { default: liff } = await import("@line/liff");
    if (liff.isLoggedIn()) {
      liff.logout();
      window.location.reload();
    }
  }, []);

  const closeWindow = useCallback(async () => {
    const { default: liff } = await import("@line/liff");
    liff.closeWindow();
  }, []);

  const sendTextMessage = useCallback(async (text: string) => {
    const { default: liff } = await import("@line/liff");

    if (!liff.isInClient()) {
      throw new Error("sendMessages is available only inside the LINE app");
    }

    await liff.sendMessages([{ type: "text", text }]);
  }, []);

  return useMemo(
    () => ({
      liffId,
      ...state,
      login,
      logout,
      closeWindow,
      sendTextMessage,
    }),
    [closeWindow, liffId, login, logout, sendTextMessage, state]
  );
}
