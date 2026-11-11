import { chatCompletion, getLlmConfig } from "@/lib/llm";
import { SPEC_SYSTEM, buildSpecUser } from "@/lib/prompts";
import { normalizeSpec } from "@/lib/spec";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const limit = checkRateLimit(clientIp(req));
  if (!limit.ok) {
    return Response.json(
      {
        error: "RATE_LIMITED",
        message: `今日生成次数已用完（${limit.limit} 次）。可以明天再试，或打开预置模板体验完整质量门禁。`,
      },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as { prompt?: unknown } | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
  if (!prompt) {
    return Response.json({ error: "INVALID_PROMPT", message: "请先描述你想做的应用。" }, { status: 400 });
  }
  if (!getLlmConfig()) {
    return Response.json(
      {
        error: "LLM_NOT_CONFIGURED",
        message: "服务端未配置 LLM_API_KEY。你仍然可以打开预置模板，体验完整的质量门禁。",
      },
      { status: 503 },
    );
  }

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: SPEC_SYSTEM },
        { role: "user", content: buildSpecUser(prompt) },
      ],
      { temperature: 0.3, maxTokens: 1400, json: true },
    );
    return Response.json({ spec: normalizeSpec(raw, prompt) });
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
