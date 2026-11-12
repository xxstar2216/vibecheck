import {
  clearSessionCookie,
  deleteSession,
  getSessionToken,
  isSecureRequest,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  deleteSession(getSessionToken(req));
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookie(isSecureRequest(req)),
        "Cache-Control": "no-store",
      },
    },
  );
}
