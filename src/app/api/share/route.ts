import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const buckets = new Map<string, { count: number; resetAt: number }>();
const DAY = 24 * 60 * 60 * 1000;
const LIMIT = 60;

function allow(ip: string): boolean {
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + DAY });
    return true;
  }
  if (current.count >= LIMIT) return false;
  current.count += 1;
  return true;
}

export async function POST(req: Request) {
  if (!allow(clientIp(req))) {
    return Response.json(
      { error: "RATE_LIMITED", message: "分享次数过多，请稍后再试。" },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    code?: unknown;
    spec?: unknown;
    report?: unknown;
  } | null;

  const code = typeof body?.code === "string" ? body.code : "";
  if (!code || code.length > 200_000 || !/<html[\s>]/i.test(code)) {
    return Response.json(
      { error: "INVALID_CODE", message: "应用代码无效。" },
      { status: 400 },
    );
  }

  const name =
    (typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "") || "未命名应用";
  const id = randomUUID();

  getDb()
    .prepare(
      "INSERT INTO shares (id, name, code, spec, report, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      id,
      name,
      code,
      body?.spec ? JSON.stringify(body.spec) : null,
      body?.report ? JSON.stringify(body.report) : null,
      Date.now(),
    );

  return Response.json({ id, url: `/share/${id}` });
}
