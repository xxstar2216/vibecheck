import { getLlmConfig, streamChatCompletion } from "@/lib/llm";
import { buildRepairSystem, buildRepairUser } from "@/lib/prompts";
import { normalizeSpec } from "@/lib/spec";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const limit = checkRateLimit(clientIp(req));
  if (!limit.ok) {
    return Response.json(
      { error: "RATE_LIMITED", message: `今日生成次数已用完（${limit.limit} 次）。` },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    code?: unknown;
    spec?: unknown;
    failures?: unknown;
  } | null;

  const code = typeof body?.code === "string" ? body.code.slice(0, 120000) : "";
  if (!code) {
    return Response.json({ error: "MISSING_CODE", message: "缺少待修复的代码。" }, { status: 400 });
  }
  if (!getLlmConfig()) {
    return Response.json(
      { error: "LLM_NOT_CONFIGURED", message: "服务端未配置 LLM_API_KEY。" },
      { status: 503 },
    );
  }

  const spec = normalizeSpec(JSON.stringify(body?.spec ?? {}), "repair", 12);
  const failures = typeof body?.failures === "string" ? body.failures.slice(0, 5000) : "未知失败";

  try {
    const stream = await streamChatCompletion(
      [
        { role: "system", content: buildRepairSystem() },
        { role: "user", content: buildRepairUser({ spec, code, failures }) },
      ],
      { temperature: 0.3, maxTokens: 16000 },
    );
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: "LLM_ERROR",
        message: error instanceof Error ? error.message : "模型调用失败",
      },
      { status: 502 },
    );
  }
}
