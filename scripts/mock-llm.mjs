import http from "node:http";

const SPEC = {
  name: "Mock 待办",
  summary: "用于验证真实服务端链路与自动修复的 Mock 应用。",
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let repairCount = 0;

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
    res.writeHead(404).end("not found");
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  const payload = JSON.parse(body || "{}");
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const isSpec = !payload.stream;
  const isRepair = lastUser.includes("失败报告");
  const kind = isSpec ? "spec" : isRepair ? "repair" : "generate";
  console.log(`[mock-llm] stream=${Boolean(payload.stream)} kind=${kind} model=${payload.model}`);

  if (isSpec) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        choices: [{ message: { role: "assistant", content: JSON.stringify(SPEC) } }],
      }),
    );
    return;
  }

  let output = isRepair ? GOOD : BROKEN;
  if (isRepair) {
    repairCount += 1;
    if (process.env.MOCK_FAIL_FIRST_REPAIR === "1" && repairCount === 1) {
      output = BROKEN;
      console.log("[mock-llm] first repair forced to BROKEN");
    }
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const chunks = output.match(/[\s\S]{1,160}/g) ?? [];
  for (const chunk of chunks) {
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
    await sleep(6);
  }
  res.write("data: [DONE]\n\n");
  res.end();
});

server.listen(4010, () => console.log("[mock-llm] listening on :4010"));
