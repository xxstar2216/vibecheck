import fs from "node:fs";
import path from "node:path";

const candidates = [".env", ".env.local"];
const loaded = [];
const env = {};

for (const file of candidates) {
  const envPath = path.resolve(file);
  if (!fs.existsSync(envPath)) continue;
  loaded.push(file);
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
}

if (loaded.length === 0) {
  console.error("未找到 .env 或 .env.local。请在 vibecheck 目录下创建其中一个并填写 LLM_API_KEY。");
  process.exit(1);
}

// 与 Next.js 的环境变量优先级保持一致：进程环境变量优先于 .env.local
const baseUrl = (process.env.LLM_BASE_URL || env.LLM_BASE_URL || "https://api.deepseek.com/v1").replace(
  /\/+$/,
  "",
);
const apiKey = process.env.LLM_API_KEY || env.LLM_API_KEY;
const model = process.env.LLM_MODEL || env.LLM_MODEL || "deepseek-flash";

if (!apiKey) {
  console.error("LLM_API_KEY 为空。请打开 vibecheck/.env.local，在 LLM_API_KEY= 后面填入 key。");
  process.exit(1);
}

const masked =
  apiKey.length > 8 ? `${apiKey.slice(0, 3)}***${apiKey.slice(-4)}` : "***";
console.log(`files: ${loaded.join(", ")}`);
console.log(`base : ${baseUrl}`);
console.log(`model: ${model}`);
console.log(`key  : ${masked}`);

const started = Date.now();
try {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "只回复 OK 两个字母。" }],
      max_tokens: 16,
      stream: false,
    }),
    signal: AbortSignal.timeout(45000),
  });
  const raw = await res.text();
  console.log(`status: ${res.status} (${Date.now() - started}ms)`);

  if (!res.ok) {
    console.error("\n请求失败，服务商返回：");
    console.error(raw.slice(0, 1200));
    console.error(
      "\n常见原因：base URL 不对、模型 ID 不存在、key 无权限、账户余额不足。",
    );
    process.exit(1);
  }

  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error("返回不是 JSON：");
    console.error(raw.slice(0, 1200));
    process.exit(1);
  }

  const content = data.choices?.[0]?.message?.content;
  console.log(`reply: ${String(content ?? "").slice(0, 120)}`);
  console.log(`served model: ${data.model ?? "(未返回)"}`);
  console.log("\n✅ 配置可用。现在可以 npm run dev，或 npm run build && npm start。");
} catch (error) {
  console.error(`\n请求异常：${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
