import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import {
  createSession,
  hashPassword,
  isSecureRequest,
  sessionCookie,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@vibecheck.dev";
const DEMO_PASSWORD = "demo1234";
const DEMO_NAME = "演示用户";

export async function POST(req: Request) {
  const db = getDb();
  const { salt, hash } = hashPassword(DEMO_PASSWORD);
  let user = db
    .prepare("SELECT id, email, name FROM users WHERE email = ?")
    .get(DEMO_EMAIL) as { id: string; email: string; name: string } | undefined;

  if (!user) {
    const id = `u_${randomUUID()}`;
    db.prepare(
      "INSERT INTO users (id, email, name, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(id, DEMO_EMAIL, DEMO_NAME, hash, salt, Date.now());
    user = { id, email: DEMO_EMAIL, name: DEMO_NAME };
  } else {
    db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?").run(
      hash,
      salt,
      user.id,
    );
  }

  const { token, expiresAt } = createSession(user.id);
  return Response.json(
    { user },
    {
      headers: {
        "Set-Cookie": sessionCookie(token, expiresAt, isSecureRequest(req)),
        "Cache-Control": "no-store",
      },
    },
  );
}
