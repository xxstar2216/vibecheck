import { getLlmConfig } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET() {
  const cfg = getLlmConfig();
  return Response.json({
    ok: true,
    configured: Boolean(cfg),
    model: cfg?.model ?? null,
  });
}
