import { getDb } from "@/lib/db";
import { getSessionUser, unauthorized } from "@/lib/auth";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROJECT_BYTES = 4 * 1024 * 1024;

export async function GET(req: Request) {
  const user = getSessionUser(req);
  if (!user) return unauthorized();

  const rows = getDb()
    .prepare("SELECT data FROM projects WHERE user_id = ? ORDER BY updated_at DESC")
    .all(user.id) as Array<{ data: string }>;

  const projects: Project[] = [];
  for (const row of rows) {
    try {
      projects.push(JSON.parse(row.data) as Project);
    } catch {
      // skip corrupted rows
    }
  }
  return Response.json({ projects }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = getSessionUser(req);
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => null)) as { project?: unknown } | null;
  const project = body?.project as Project | undefined;
  if (
    !project ||
    typeof project.id !== "string" ||
    !project.id ||
    typeof project.name !== "string" ||
    !Array.isArray(project.versions)
  ) {
    return Response.json(
      { error: "INVALID_PROJECT", message: "项目数据不完整。" },
      { status: 400 },
    );
  }

  const data = JSON.stringify(project);
  if (data.length > MAX_PROJECT_BYTES) {
    return Response.json(
      { error: "PROJECT_TOO_LARGE", message: "项目数据过大。" },
      { status: 413 },
    );
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT user_id FROM projects WHERE id = ?")
    .get(project.id) as { user_id: string } | undefined;

  if (existing && existing.user_id !== user.id) {
    return Response.json(
      { error: "FORBIDDEN", message: "无权访问该项目。" },
      { status: 403 },
    );
  }

  const now = Date.now();
  db.prepare(
    `INSERT INTO projects (id, user_id, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
     WHERE projects.user_id = excluded.user_id`,
  ).run(project.id, user.id, data, project.createdAt || now, now);

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = getSessionUser(req);
  if (!user) return unauthorized();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return Response.json(
      { error: "MISSING_ID", message: "缺少项目 ID。" },
      { status: 400 },
    );
  }

  getDb()
    .prepare("DELETE FROM projects WHERE id = ? AND user_id = ?")
    .run(id, user.id);

  return Response.json({ ok: true });
}
