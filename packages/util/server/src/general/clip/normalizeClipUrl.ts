const TRACKING_PARAMS = new Set([
  "gclid",
  "fbclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "yclid",
  "dclid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "_ga",
  "_gl",
]);

const isTrackingParam = (key: string): boolean => {
  const lower = key.toLowerCase();
  return lower.startsWith("utm_") || TRACKING_PARAMS.has(lower);
};

export const normalizeClipUrl = (url: string): string => {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";

    for (const key of [...parsed.searchParams.keys()]) {
      if (isTrackingParam(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();

    return parsed.toString();
  } catch {
    return url.trim();
  }
};
