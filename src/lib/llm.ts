export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function getLlmConfig(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.deepseek.com/v1").replace(/\/+$/, "");
  const model = process.env.LLM_MODEL || "deepseek-flash";
  return { baseUrl, apiKey, model };
}

function endpoint(cfg: LlmConfig): string {
  return `${cfg.baseUrl}/chat/completions`;
}

async function post(
  cfg: LlmConfig,
  messages: ChatMessage[],
  stream: boolean,
  opts: { temperature?: number; maxTokens?: number; json?: boolean },
): Promise<Response> {
  const base: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 2000,
    stream,
  };
  const make = (withJson: boolean) =>
    fetch(endpoint(cfg), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(withJson ? { ...base, response_format: { type: "json_object" } } : base),
    });

  let res = await make(Boolean(opts.json));
  if (!res.ok && opts.json && (res.status === 400 || res.status === 422)) {
    res = await make(false);
  }
  return res;
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; json?: boolean } = {},
): Promise<string> {
  const cfg = getLlmConfig();
  if (!cfg) throw new Error("LLM_NOT_CONFIGURED");
  const res = await post(cfg, messages, false, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`模型请求失败 (${res.status})：${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<ReadableStream<Uint8Array>> {
  const cfg = getLlmConfig();
  if (!cfg) throw new Error("LLM_NOT_CONFIGURED");
  const res = await post(cfg, messages, true, opts);
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`模型请求失败 (${res.status})：${text.slice(0, 300)}`);
  }

  const upstream = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await upstream.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // ignore keep-alive / non-JSON frames
            }
          }
        }
        controller.close();
      } catch (error) {
        try {
          controller.error(error);
        } catch {
          // already closed by the client
        }
      }
    },
    cancel() {
      upstream.cancel().catch(() => {});
    },
  });
}
