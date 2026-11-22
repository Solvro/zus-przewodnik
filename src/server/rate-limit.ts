import "server-only";

/** Prosty limiter w pamięci procesu (best effort) — chroni koszt wywołań AI przed nadużyciem. */
const buckets = new Map<string, { tokens: number; at: number }>();

export function allow(req: Request, key: string, perMinute = 10): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(id) ?? { tokens: perMinute, at: now };
  b.tokens = Math.min(perMinute, b.tokens + ((now - b.at) / 60_000) * perMinute);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(id, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(id, b);
  return true;
}
