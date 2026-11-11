import type {
  AcceptanceCheck,
  AppSpec,
  CheckResult,
  Finding,
  QualityReport,
  TestOutcome,
} from "./types";

const RESILIENCE_IDS = new Set([
  "doctype",
  "viewport",
  "title",
  "testids",
  "storage-bridge",
  "responsive",
  "empty-state",
  "size",
  "offline",
]);

export function cleanGeneratedCode(raw: string): string {
  let text = (raw || "").trim();
  text = text.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "");
  const docIndex = text.search(/<!doctype\s+html/i);
  const htmlIndex = text.search(/<html[\s>]/i);
  const start = docIndex >= 0 ? docIndex : htmlIndex;
  if (start > 0) text = text.slice(start);
  const end = text.lastIndexOf("</html>");
  if (end >= 0) text = text.slice(0, end + 7);
  return text.trim();
}

export function staticFindings(code: string): Finding[] {
  const has = (re: RegExp) => re.test(code);
  const testidCount = (code.match(/data-testid\s*=/gi) || []).length;
  const sizeKb = Math.round(new TextEncoder().encode(code).length / 1024);
  const findings: Finding[] = [];

  findings.push({
    id: "doctype",
    label: "完整 HTML 文档",
    status: has(/<!doctype\s+html/i) || has(/<html[\s>]/i) ? "pass" : "fail",
  });
  findings.push({
    id: "viewport",
    label: "包含 viewport meta",
    status: has(/name\s*=\s*["']viewport["']/i) ? "pass" : "fail",
  });
  findings.push({
    id: "title",
    label: "包含页面标题",
    status: has(/<title>[^<]+<\/title>/i) ? "pass" : "warn",
  });
  findings.push({
    id: "testids",
    label: `测试钩子 data-testid（${testidCount} 个）`,
    status: testidCount >= 3 ? "pass" : "warn",
    detail: testidCount >= 3 ? undefined : "至少 3 个 data-testid 才能支撑稳定验收",
  });
  const usesBridge = /__atoms[\s\S]{0,80}storage/i.test(code);
  const usesLocalStorage = /\blocalStorage\b/.test(code);
  findings.push({
    id: "storage-bridge",
    label: "通过安全存储桥持久化",
    status: usesBridge ? "pass" : usesLocalStorage ? "fail" : "warn",
    detail: usesLocalStorage && !usesBridge
      ? "沙箱是不透明源，直接使用 localStorage 会抛 SecurityError"
      : usesBridge
        ? undefined
        : "未检测到持久化，刷新后数据可能丢失",
  });
  findings.push({
    id: "responsive",
    label: "包含响应式样式",
    status: has(/@media/i) ? "pass" : "warn",
  });
  findings.push({
    id: "empty-state",
    label: "包含空状态提示",
    status: /(暂无|还没有|空空|没有数据|empty-state|data-testid=["']empty)/i.test(code) ? "pass" : "warn",
  });
  findings.push({
    id: "offline",
    label: "无外部运行时依赖",
    status: /(?:fetch\s*\(|XMLHttpRequest|src\s*=\s*["']https?:|href\s*=\s*["']https?:)/i.test(code)
      ? "warn"
      : "pass",
    detail: "生成物应可离线运行，外部依赖会影响可复现性",
  });
  findings.push({
    id: "size",
    label: `代码体积 ${sizeKb}KB`,
    status: sizeKb < 60 ? "pass" : sizeKb < 100 ? "warn" : "fail",
    detail: sizeKb >= 60 ? "单文件应用建议控制在 60KB 以内" : undefined,
  });
  return findings;
}

export function buildReport(args: {
  code: string;
  spec: AppSpec;
  outcome: TestOutcome;
  durationMs: number;
}): QualityReport {
  const { code, spec, outcome, durationMs } = args;
  const statics = staticFindings(code);
  const runtimeIssues = outcome.errors ?? [];
  const results: CheckResult[] = outcome.results.length
    ? outcome.results
    : spec.checks.map((c) => ({
        id: c.id,
        description: c.description,
        kind: c.kind,
        status: "skip" as const,
        detail: outcome.timedOut ? "验收超时，未执行" : "未执行",
      }));

  const acceptanceResults = results.filter((r) => r.kind !== "noRuntimeErrors");
  const acceptancePass = acceptanceResults.filter((r) => r.status === "pass").length;
  const acceptance = acceptanceResults.length
    ? (acceptancePass / acceptanceResults.length) * 40
    : 0;

  const runtime = runtimeIssues.length === 0 ? 30 : Math.max(0, 30 - runtimeIssues.length * 10);

  const a11yFails = outcome.a11y.filter((f) => f.status === "fail").length;
  const a11yWarns = outcome.a11y.filter((f) => f.status === "warn").length;
  const a11y = Math.max(0, 15 - a11yFails * 5 - a11yWarns);

  const resilience = statics.filter((f) => RESILIENCE_IDS.has(f.id));
  let resilienceScore = 15;
  for (const f of resilience) {
    if (f.status === "fail") resilienceScore -= 4;
    else if (f.status === "warn") resilienceScore -= 1.5;
  }
  resilienceScore = Math.max(0, resilienceScore);

  const runtimeCheck = results.find((r) => r.kind === "noRuntimeErrors");
  const score = Math.round(runtime + acceptance + a11y + resilienceScore);
  const passed =
    score >= 80 &&
    runtimeIssues.length === 0 &&
    !outcome.timedOut &&
    (runtimeCheck ? runtimeCheck.status !== "fail" : true);

  return {
    score,
    passed,
    breakdown: {
      runtime: Math.round(runtime),
      acceptance: Math.round(acceptance),
      a11y: Math.round(a11y),
      resilience: Math.round(resilienceScore),
    },
    checkResults: results,
    runtimeIssues,
    a11y: outcome.a11y,
    statics,
    resilience,
    durationMs,
    generatedAt: Date.now(),
    timedOut: outcome.timedOut,
  };
}

const PROBE_JS = String.raw`
(function () {
  window.__atomsErrors = [];
  function push(type, message) {
    try {
      window.__atomsErrors.push({ type: type, message: String(message).slice(0, 600), at: Date.now() });
    } catch (e) {}
  }
  window.addEventListener('error', function (e) {
    push('error', (e && (e.message || (e.error && e.error.message))) || 'Script error');
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    push('unhandledrejection', (r && (r.message || r)) || 'Unhandled rejection');
  });
  var origConsoleError = console.error;
  console.error = function () {
    try {
      push('console', Array.prototype.map.call(arguments, function (x) { return String(x); }).join(' '));
    } catch (e) {}
    return origConsoleError.apply(console, arguments);
  };

  var seq = 0;
  var pending = {};
  function call(type, payload) {
    return new Promise(function (resolve) {
      var id = ++seq;
      pending[id] = resolve;
      parent.postMessage(Object.assign({ __atoms: true, type: type, id: id }, payload), '*');
      setTimeout(function () {
        if (pending[id]) { delete pending[id]; resolve(null); }
      }, 2000);
    });
  }
  window.__atoms = {
    storage: {
      get: function (key) { return call('storage-get', { key: String(key) }); },
      set: function (key, value) { return call('storage-set', { key: String(key), value: value }); },
      remove: function (key) { return call('storage-remove', { key: String(key) }); }
    }
  };
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'storage-result') return;
    var r = pending[d.id];
    if (r) { delete pending[d.id]; r(d.value); }
  });
})();
`;

function buildHarness(checks: AcceptanceCheck[], runId: string): string {
  const safeChecks = JSON.stringify(checks).replace(/</g, "\\u003c");
  const safeRunId = JSON.stringify(runId).replace(/</g, "\\u003c");
  return String.raw`
(function () {
  var RUN_ID = ${safeRunId};
  var CHECKS = ${safeChecks};
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var post = function (type, payload) {
    try { parent.postMessage(Object.assign({ __atoms: true, type: type, runId: RUN_ID }, payload), '*'); } catch (e) {}
  };

  function visible(el) {
    if (!el) return false;
    var s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function find(check) {
    var el = null;
    if (check.selector) {
      try { el = document.querySelector(check.selector); } catch (e) {}
    }
    if (!el && check.text) {
      var nodes = document.querySelectorAll('button,a,[role="button"],h1,h2,h3,p,span,label,li,div');
      for (var i = 0; i < nodes.length; i++) {
        if ((nodes[i].textContent || '').trim().indexOf(check.text) >= 0) { el = nodes[i]; break; }
      }
    }
    return el;
  }
  function findInput(check) {
    try { return check.selector ? document.querySelector(check.selector) : null; } catch (e) { return null; }
  }
  async function waitFor(fn, timeout) {
    var start = Date.now();
    while (Date.now() - start < timeout) {
      var v = fn();
      if (v) return v;
      await wait(80);
    }
    return null;
  }
  async function waitAsync(fn, timeout) {
    var start = Date.now();
    while (Date.now() - start < timeout) {
      var v = await fn();
      if (v !== null && v !== undefined && v !== '') return v;
      await wait(120);
    }
    return null;
  }
  function setValue(el, value) {
    var proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  async function runCheck(check) {
    var t0 = performance.now();
    function pass(detail) {
      return { id: check.id, kind: check.kind, description: check.description, status: 'pass', detail: detail, durationMs: Math.round(performance.now() - t0) };
    }
    function fail(detail) {
      return { id: check.id, kind: check.kind, description: check.description, status: 'fail', detail: detail, durationMs: Math.round(performance.now() - t0) };
    }
    try {
      if (check.kind === 'visible') {
        var el = await waitFor(function () { return find(check); }, 2200);
        if (!el) return fail('未找到元素：' + (check.selector || check.text));
        if (!visible(el)) return fail('元素存在但不可见');
        if (check.expect && (el.textContent || '').indexOf(check.expect) < 0) return fail('文本未包含「' + check.expect + '」');
        return pass();
      }
      if (check.kind === 'click') {
        var el2 = await waitFor(function () { return find(check); }, 2200);
        if (!el2) return fail('未找到可点击元素：' + (check.selector || check.text));
        el2.click();
        await wait(180);
        return pass('已点击');
      }
      if (check.kind === 'input') {
        var input = await waitFor(function () { return findInput(check); }, 2200);
        if (!input) return fail('未找到输入框：' + check.selector);
        setValue(input, check.value || '');
        await wait(120);
        return pass('已输入「' + (check.value || '') + '」');
      }
      if (check.kind === 'expectVisible') {
        var el3 = await waitFor(function () { return find(check); }, 2200);
        if (!el3 || !visible(el3)) return fail('期望可见，但未出现');
        return pass();
      }
      if (check.kind === 'expectText') {
        var el4 = await waitFor(function () { return find(check); }, 2200);
        if (!el4) return fail('未找到元素：' + (check.selector || check.text));
        var text = (el4.textContent || '').trim();
        if (check.expect && text.indexOf(check.expect) < 0) return fail('文本为「' + text.slice(0, 60) + '」，未包含「' + check.expect + '」');
        return pass();
      }
      if (check.kind === 'expectStorage') {
        var key = check.storageKey || 'app-state';
        if (!window.__atoms || !window.__atoms.storage) return fail('应用没有使用安全存储桥');
        var raw = await waitAsync(function () { return window.__atoms.storage.get(key); }, 2500);
        if (raw === null || raw === undefined || raw === '') return fail('存储键「' + key + '」为空');
        var str = typeof raw === 'string' ? raw : JSON.stringify(raw);
        if (check.expect && str.indexOf(check.expect) < 0) return fail('存储值未包含「' + check.expect + '」');
        return pass('已写入 ' + key);
      }
      if (check.kind === 'noRuntimeErrors') {
        var errs = window.__atomsErrors || [];
        if (errs.length) return fail(errs.length + ' 个运行时错误：' + errs[0].message);
        return pass();
      }
      return fail('未知检查类型：' + check.kind);
    } catch (e) {
      return fail((e && e.message) || '检查执行异常');
    }
  }

  function auditA11y() {
    var out = [];
    var seen = {};
    function add(id, label, status, detail) {
      var k = id + '|' + String(detail || '').slice(0, 40);
      if (seen[k]) return;
      seen[k] = true;
      if (out.length < 10) out.push({ id: id, label: label, status: status, detail: detail });
    }
    Array.prototype.forEach.call(document.querySelectorAll('input,textarea,select'), function (el) {
      var hasName = (el.labels && el.labels.length) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('placeholder') || el.getAttribute('title');
      if (!hasName) add('label:' + (el.getAttribute('data-testid') || el.name || el.type), '表单控件缺少可访问名称', 'fail', (el.outerHTML || '').slice(0, 100));
    });
    Array.prototype.forEach.call(document.querySelectorAll('img'), function (img) {
      if (!img.getAttribute('alt')) add('img-alt', '图片缺少 alt', 'fail', (img.outerHTML || '').slice(0, 100));
    });
    Array.prototype.forEach.call(document.querySelectorAll('button'), function (btn) {
      if (!(btn.textContent || '').trim() && !btn.getAttribute('aria-label')) add('btn-name', '按钮缺少可访问名称', 'fail', (btn.outerHTML || '').slice(0, 100));
    });
    if (!document.documentElement.getAttribute('lang')) add('html-lang', '缺少 html lang', 'warn');
    return out;
  }

  async function main() {
    // 不要等 load：外部字体/CDN 可能长时间不返回，会把验收卡到超时。
    if (document.readyState === 'loading') {
      await new Promise(function (resolve) {
        var done = false;
        function finish() { if (!done) { done = true; resolve(); } }
        document.addEventListener('DOMContentLoaded', finish, { once: true });
        setTimeout(finish, 3000);
      });
    }
    await wait(250);
    var results = [];
    for (var i = 0; i < CHECKS.length; i++) {
      var r = await runCheck(CHECKS[i]);
      results.push(r);
      post('atoms-check', { result: r });
    }
    post('atoms-tests-complete', {
      results: results,
      a11y: auditA11y(),
      errors: (window.__atomsErrors || []).slice(0, 20)
    });
  }
  main();
})();
`;
}

export function buildSrcDoc(
  code: string,
  testRun: { runId: string; checks: AcceptanceCheck[] } | null,
): string {
  const probe = `<script>${PROBE_JS}</script>`;
  const harness = testRun ? `<script>${buildHarness(testRun.checks, testRun.runId)}</script>` : "";
  let doc = (code || "").trim();
  if (!doc) return "<!DOCTYPE html><html><head></head><body></body></html>";

  if (/<head[^>]*>/i.test(doc)) {
    doc = doc.replace(/<head[^>]*>/i, (m) => `${m}${probe}`);
  } else if (/<html[^>]*>/i.test(doc)) {
    doc = doc.replace(/<html[^>]*>/i, (m) => `${m}<head>${probe}</head>`);
  } else {
    doc = `<!DOCTYPE html><html><head>${probe}</head><body>${doc}</body></html>`;
  }

  if (harness) {
    if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, `${harness}</body>`);
    else doc += harness;
  }
  return doc;
}

export function reportToMarkdown(report: QualityReport, spec: AppSpec | null): string {
  const lines: string[] = [];
  lines.push(`# 质量报告 · ${spec?.name || "应用"}`);
  if (spec?.summary) lines.push(`> ${spec.summary}`);
  lines.push("");
  lines.push(`- 得分：**${report.score}/100**`);
  lines.push(`- 门禁：**${report.passed ? "通过" : "已阻止交付"}**`);
  lines.push(`- 耗时：${(report.durationMs / 1000).toFixed(1)}s`);
  const passCount = report.checkResults.filter((r) => r.status === "pass").length;
  lines.push(`- 验收：${passCount}/${report.checkResults.length} 项通过`);
  lines.push("");
  lines.push("## 验收用例");
  for (const r of report.checkResults) {
    lines.push(
      `- [${r.status === "pass" ? "x" : " "}] ${r.description}${r.detail ? ` — ${r.detail}` : ""}`,
    );
  }
  if (report.runtimeIssues.length) {
    lines.push("");
    lines.push("## 运行时错误");
    for (const issue of report.runtimeIssues.slice(0, 10)) {
      lines.push(`- [${issue.type}] ${issue.message}`);
    }
  }
  const issues = [
    ...report.statics.filter((f) => f.status !== "pass"),
    ...report.a11y,
  ];
  if (issues.length) {
    lines.push("");
    lines.push("## 静态检查 / 可访问性问题");
    for (const find of issues) {
      lines.push(`- [${find.status}] ${find.label}${find.detail ? `：${find.detail}` : ""}`);
    }
  }
  lines.push("");
  lines.push("_由 VibeCheck 自动生成_");
  return lines.join("\n");
}

export function toPlaywright(spec: AppSpec): string {
  const lines: string[] = [];
  for (const c of spec.checks) {
    if (c.kind === "noRuntimeErrors") continue;
    const selector = JSON.stringify(c.selector || "body");
    if (c.kind === "visible" || c.kind === "expectVisible") {
      lines.push(`  await expect(page.locator(${selector})).toBeVisible();`);
    } else if (c.kind === "click") {
      lines.push(`  await page.locator(${selector}).click();`);
    } else if (c.kind === "input") {
      lines.push(`  await page.locator(${selector}).fill(${JSON.stringify(c.value || "")});`);
    } else if (c.kind === "expectText") {
      lines.push(`  await expect(page.locator(${selector})).toContainText(${JSON.stringify(c.expect || "")});`);
    } else if (c.kind === "expectStorage") {
      const key = JSON.stringify(c.storageKey || "app-state");
      lines.push(`  const stored = await page.evaluate(() => localStorage.getItem(${key}));`);
      lines.push(`  expect(stored || "").toContain(${JSON.stringify(c.expect || "")});`);
    }
  }
  return `import { test, expect } from '@playwright/test';

test(${JSON.stringify(`${spec.name} - 自动生成验收用例`)}, async ({ page }) => {
  // 生成物在预览沙箱里通过 __atoms.storage 持久化；独立部署时用 localStorage 垫片。
  await page.addInitScript(() => {
    (window as any).__atoms = {
      storage: {
        get: async (k: string) => localStorage.getItem(k),
        set: async (k: string, v: string) => localStorage.setItem(k, v),
        remove: async (k: string) => localStorage.removeItem(k),
      },
    };
  });
  await page.goto('/');
${lines.join("\n")}
});
`;
}
