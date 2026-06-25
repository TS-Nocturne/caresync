const FALLBACK_PATHS = new Set(["/dashboard", "/onboarding"]);

export function sanitizeCallbackUrl(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;

  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
    if (decoded.includes("\\") || decoded.includes("\0")) return fallback;

    const url = new URL(decoded, "http://local.app");
    if (url.origin !== "http://local.app") return fallback;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK_PATHS.has(fallback) ? fallback : "/dashboard";
  }
}
