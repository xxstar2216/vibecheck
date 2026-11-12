import { getDb } from "@/lib/db";
import {
  createSession,
  isSecureRequest,
  normalizeEmail,
  sessionCookie,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;

  const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return Response.json(
      { error: "INVALID_LOGIN", message: "请输入邮箱和密码。" },
      { status: 400 },
    );
  }

  const row = getDb()
    .prepare("SELECT id, email, name, password_hash, salt FROM users WHERE email = ?")
    .get(email) as
    | { id: string; email: string; name: string; password_hash: string; salt: string }
    | undefined;

  if (!row || !verifyPassword(password, row.salt, row.password_hash)) {
    return Response.json(
      { error: "INVALID_CREDENTIALS", message: "邮箱或密码错误。" },
      { status: 401 },
    );
  }

  const { token, expiresAt } = createSession(row.id);
  return Response.json(
    { user: { id: row.id, email: row.email, name: row.name } },
    {
      headers: {
        "Set-Cookie": sessionCookie(token, expiresAt, isSecureRequest(req)),
        "Cache-Control": "no-store",
      },
    },
  );
}
