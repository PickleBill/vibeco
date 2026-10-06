// Per-IP request limits for public endpoints. State is per function instance,
// which is enough to stop casual abuse of paid search and model calls.

export function createRateLimiter(maxPerWindow: number, windowMs = 60_000) {
  const hits = new Map<string, number[]>();
  return (req: Request): boolean => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length > maxPerWindow;
  };
}
