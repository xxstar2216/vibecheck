import { chromium } from "playwright-core";

const url = process.env.APP_URL || "http://localhost:3000";
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const SPEC = {
  name: "Mock 待办",
  summary: "用于验证生成与自动修复链路的 Mock 应用。",
  features: ["添加", "持久化"],
  checks: [
    { id: "c1", description: "标题可见", kind: "visible", selector: '[data-testid="app-title"]' },
    { id: "c2", description: "输入内容", kind: "input", selector: '[data-testid="main-input"]', value: "买牛奶" },
    { id: "c3", description: "点击添加", kind: "click", selector: '[data-testid="add-btn"]' },
    { id: "c4", description: "结果出现", kind: "expectText", selector: '[data-testid="item-list"]', expect: "买牛奶" },
    { id: "c5", description: "写入持久化", kind: "expectStorage", storageKey: "app-state", expect: "买牛奶" },
    { id: "c6", description: "无运行时错误", kind: "noRuntimeErrors" },
  ],
};

const GOOD = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mock 待办</title>
<style>body{font-family:sans-serif;padding:24px}@media(max-width:600px){body{padding:12px}}</style></head>
<body><h1 data-testid="app-title">Mock 待办</h1>
<form data-testid="form"><input data-testid="main-input" aria-label="内容"><button data-testid="add-btn" type="submit">添加</button></form>
<p data-testid="empty-state">还没有内容</p><ul data-testid="item-list"></ul>
<script>(async function(){var store=window.__atoms&&window.__atoms.storage;var KEY='app-state';var state={items:[]};
var list=document.querySelector('[data-testid="item-list"]');var empty=document.querySelector('[data-testid="empty-state"]');var input=document.querySelector('[data-testid="main-input"]');
document.querySelector('[data-testid="form"]').addEventListener('submit',async function(e){e.preventDefault();var t=input.value.trim();if(!t)return;state.items.unshift(t);input.value='';render();if(store)await store.set(KEY,JSON.stringify(state));});
function render(){list.innerHTML='';empty.style.display=state.items.length?'none':'block';state.items.forEach(function(t){var li=document.createElement('li');li.textContent=t;list.appendChild(li);});}
try{var raw=store?await store.get(KEY):null;if(raw)state=JSON.parse(raw);}catch(e){}render();})();</script></body></html>`;

const BROKEN = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Broken</title></head><body><h1 data-testid="app-title">Broken</h1></body></html>`;

const browser = await chromium.launch({ headless: true, executablePath: edge });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

let generateCalls = 0;
let repairCalls = 0;
await page.route("**/api/health", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, configured: true, model: "mock-model" }),
  }),
);
await page.route("**/api/spec", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ spec: SPEC }) }),
);
await page.route("**/api/generate", (route) => {
  generateCalls += 1;
  return route.fulfill({ status: 200, contentType: "text/plain; charset=utf-8", body: BROKEN });
});
await page.route("**/api/repair", (route) => {
  repairCalls += 1;
  return route.fulfill({ status: 200, contentType: "text/plain; charset=utf-8", body: GOOD });
});

await page.goto(url, { waitUntil: "networkidle" });
await page.locator("textarea").fill("做一个 Mock 待办，支持添加和持久化");
await page.getByRole("button", { name: "生成", exact: true }).click();

await page.getByText("质量门禁通过").waitFor({ timeout: 45000 });
const text = await page.locator("main").innerText();
console.log("generate calls:", generateCalls, "repair calls:", repairCalls);
console.log("final gate passed:", text.includes("质量门禁通过"));
console.log("score 100:", await page.getByText("100", { exact: true }).count());
const chat = await page.locator("section").first().innerText();
console.log("repair mentioned:", chat.includes("自动修复"));
console.log("report excerpt:", text.slice(0, 220).replace(/\n+/g, " | "));
await page.screenshot({ path: "scripts/04-repair.png" });
console.log("errors:", JSON.stringify(errors));
await browser.close();
