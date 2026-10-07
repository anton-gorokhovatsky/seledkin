// Service visits must be excluded before the vendor tag is loaded, not just
// from individual goals. Keep the exclusion when a test follows a clean link.
export const exclusionKey = "seledkin-analytics-excluded";

export function analyticsAllowed(url, storage, automated = false) {
  if (!["ks.fish", "www.ks.fish"].includes(url.hostname)) return false;
  const marked = ["audit", "release", "qa"].some(key => url.searchParams.has(key));
  const mode = url.searchParams.get("analytics");
  const excluded = marked || automated || mode === "off";
  try {
    if (excluded) storage?.setItem(exclusionKey, "1");
    else if (mode === "on") storage?.removeItem(exclusionKey);
    if (storage?.getItem(exclusionKey) === "1") return false;
  } catch { /* A blocked store must not break shopping or the URL exclusion. */ }
  return !excluded;
}
