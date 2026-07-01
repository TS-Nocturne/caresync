export function getLiffId() {
  return process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim() ?? "";
}

export function buildLiffDeepLink(params: Record<string, string | null | undefined> = {}) {
  const liffId = getLiffId();
  if (!liffId) return null;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return `line://app/${liffId}${query ? `?${query}` : ""}`;
}

export function isLineInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.toLowerCase().includes("line/");
}
