"use client";

import { useEffect, useState } from "react";
import type { PortalAccess } from "@/lib/workspace-access";

export function usePortalAccess(orgId: string | undefined) {
  const [access, setAccess] = useState<PortalAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!orgId) {
      const timeoutId = window.setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
      };
    }

    async function load() {
      try {
        const res = await fetch(`/api/me/portal-access?orgId=${orgId}`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled && res.ok) setAccess(json.data);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [orgId]);

  return { access, loading };
}
