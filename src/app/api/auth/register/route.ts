import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import {
  createSession,
  hashPassword,
  isSecureRequest,
  normalizeEmail,
  sessionCookie,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
    name?: unknown;
  } | null;

  const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json(
      { error: "INVALID_EMAIL", message: "请输入有效邮箱。" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return Response.json(
      { error: "WEAK_PASSWORD", message: "密码至少 8 位。" },
      { status: 400 },
    );
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return Response.json(
      { error: "EMAIL_EXISTS", message: "该邮箱已注册，请直接登录。" },
      { status: 409 },
    );
  }

  const id = `u_${randomUUID()}`;
  const displayName = name || email.split("@")[0];
  const { salt, hash } = hashPassword(password);

  try {
    db.prepare(
      "INSERT INTO users (id, email, name, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(id, email, displayName, hash, salt, Date.now());
  } catch {
    return Response.json(
      { error: "DB_ERROR", message: "注册失败，请重试。" },
      { status: 500 },
    );
  }

  const { token, expiresAt } = createSession(id);
  return Response.json(
    { user: { id, email, name: displayName } },
    {
      headers: {
        "Set-Cookie": sessionCookie(token, expiresAt, isSecureRequest(req)),
        "Cache-Control": "no-store",
      },
    },
  );
}
