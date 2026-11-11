import type { AcceptanceCheck, AppSpec, CheckKind } from "./types";

const KINDS: CheckKind[] = [
  "visible",
  "click",
  "input",
  "expectVisible",
  "expectText",
  "expectStorage",
  "noRuntimeErrors",
];

function asString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function parseJson(raw: string): Record<string, unknown> | null {
  let text = (raw || "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function fallbackName(prompt: string): string {
  const cleaned = prompt.replace(/[，。,.!?！？\s]+/g, " ").trim();
  return (cleaned || "未命名应用").slice(0, 12);
}

export function fallbackSpec(prompt: string): AppSpec {
  return {
    name: fallbackName(prompt),
    summary: "一个可直接运行的单页应用。",
    features: ["核心交互", "本地持久化"],
    checks: [
      {
        id: "c1",
        description: "页面标题可见",
        kind: "visible",
        selector: '[data-testid="app-title"]',
      },
      { id: "c2", description: "无运行时错误", kind: "noRuntimeErrors" },
    ],
  };
}

export function normalizeSpec(raw: string, prompt: string, maxChecks = 6): AppSpec {
  const parsed = parseJson(raw);
  if (!parsed) return fallbackSpec(prompt);
  const checkLimit = Math.max(1, Math.min(12, maxChecks));

  const name = asString(parsed.name, 24) || fallbackName(prompt);
  const summary = asString(parsed.summary, 120) || "一个可直接运行的单页应用。";
  const features = Array.isArray(parsed.features)
    ? parsed.features
        .map((f) => asString(f, 40))
        .filter((f): f is string => Boolean(f))
        .slice(0, 5)
    : [];

  const rawChecks = Array.isArray(parsed.checks) ? parsed.checks : [];
  const checks: AcceptanceCheck[] = [];
  rawChecks.slice(0, 8).forEach((item) => {
    if (!item || typeof item !== "object") return;
    const c = item as Record<string, unknown>;
    const kind = KINDS.includes(c.kind as CheckKind) ? (c.kind as CheckKind) : null;
    if (!kind || kind === "noRuntimeErrors") return;

    const selector = asString(c.selector, 200);
    const text = asString(c.text, 40);
    if (kind !== "expectStorage" && !selector && !text) return;

    let value = asString(c.value, 80);
    if (kind === "input" && !value) value = "测试";

    checks.push({
      id: `c${checks.length + 1}`,
      description: asString(c.description, 80) || `检查 ${checks.length + 1}`,
      kind,
      selector,
      text,
      value,
      expect: asString(c.expect, 80),
      storageKey: kind === "expectStorage" ? asString(c.storageKey, 40) || "app-state" : undefined,
    });
  });

  const limited = checks.slice(0, checkLimit);
  if (!limited.some((c) => c.kind === "visible")) {
    limited.unshift({
      id: "c0",
      description: "页面标题可见",
      kind: "visible",
      selector: '[data-testid="app-title"]',
    });
  }
  const renumbered = limited.map((c, i) => ({ ...c, id: `c${i + 1}` }));
  renumbered.push({ id: `c${renumbered.length + 1}`, description: "无运行时错误", kind: "noRuntimeErrors" });

  if (renumbered.length <= 2) return fallbackSpec(prompt);

  return {
    name,
    summary,
    features: features.length ? features : ["核心交互", "本地持久化"],
    checks: renumbered,
  };
}
