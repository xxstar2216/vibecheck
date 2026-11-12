import { getLlmConfig, streamChatCompletion } from "@/lib/llm";
import { buildCodeSystem, buildCodeUser, buildEditUser } from "@/lib/prompts";
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
    prompt?: unknown;
    spec?: unknown;
    previousCode?: unknown;
    mode?: unknown;
  } | null;

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
  if (!prompt) {
    return Response.json({ error: "INVALID_PROMPT", message: "缺少需求描述。" }, { status: 400 });
  }
  if (!getLlmConfig()) {
    return Response.json(
      { error: "LLM_NOT_CONFIGURED", message: "服务端未配置 LLM_API_KEY。" },
      { status: 503 },
    );
  }

  const spec = normalizeSpec(JSON.stringify(body?.spec ?? {}), prompt, 12);
  const mode = body?.mode === "edit" ? "edit" : "generate";
  const previousCode =
    typeof body?.previousCode === "string" ? body.previousCode.slice(0, 120000) : "";

  if (mode === "edit" && !previousCode) {
    return Response.json({ error: "MISSING_CODE", message: "缺少待修改的代码。" }, { status: 400 });
  }

  const messages =
    mode === "edit"
      ? [
          { role: "system" as const, content: buildCodeSystem(spec) },
          { role: "user" as const, content: buildEditUser(prompt, spec, previousCode) },
        ]
      : [
          { role: "system" as const, content: buildCodeSystem(spec) },
          { role: "user" as const, content: buildCodeUser(prompt) },
        ];

  try {
    const stream = await streamChatCompletion(messages, { temperature: 0.5, maxTokens: 16000 });
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
