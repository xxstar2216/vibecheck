import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return Response.json(
    { user: getSessionUser(req) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
