type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "local";
}

export function checkRateLimit(ip: string): { ok: boolean; remaining: number; limit: number } {
  const limit = Math.max(1, Number(process.env.DAILY_LIMIT || 20));
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  if (buckets.size > 5000) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  const current = buckets.get(ip);
  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + day });
    return { ok: true, remaining: limit - 1, limit };
  }
  if (current.count >= limit) {
    return { ok: false, remaining: 0, limit };
  }
  current.count += 1;
  return { ok: true, remaining: limit - current.count, limit };
}
