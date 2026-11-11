import type { AppSpec } from "./types";

export interface DemoApp {
  id: string;
  title: string;
  tagline: string;
  prompt: string;
  spec: AppSpec;
  code: string;
}

const TODO_CODE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>今日待办</title>
<style>
:root{--bg:#0f1115;--panel:#171a21;--line:#272c37;--text:#e9ebf2;--muted:#98a1b3;--accent:#34d399;--danger:#fb7185;--radius:16px}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:radial-gradient(900px 500px at 15% -10%,#12352a 0%,transparent 60%),var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans SC",sans-serif;display:flex;justify-content:center;padding:44px 18px}
.app{width:100%;max-width:540px}
header{margin-bottom:22px}
h1{font-size:26px;letter-spacing:-.02em;margin:0 0 6px}
.sub{color:var(--muted);font-size:13px;margin:0}
form{display:flex;gap:8px;margin:22px 0 14px}
input{flex:1;min-width:0;background:var(--panel);border:1px solid var(--line);color:var(--text);padding:12px 14px;border-radius:12px;font-size:14px;outline:none;transition:.15s}
input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(52,211,153,.12)}
button{cursor:pointer;font:inherit}
.add{background:var(--accent);color:#06231a;border:none;padding:12px 18px;border-radius:12px;font-weight:700;font-size:14px}
.add:hover{filter:brightness(1.06)}
.empty{color:var(--muted);font-size:13px;text-align:center;padding:26px 0;border:1px dashed var(--line);border-radius:var(--radius)}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
li{display:flex;align-items:center;gap:10px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px}
li .text{flex:1;font-size:14px;word-break:break-word}
li.done .text{color:var(--muted);text-decoration:line-through}
.check{width:26px;height:26px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--accent);font-size:14px;line-height:1;display:grid;place-items:center}
li.done .check{background:rgba(52,211,153,.15);border-color:rgba(52,211,153,.4)}
.del{background:transparent;border:none;color:var(--muted);font-size:18px;padding:4px 6px;border-radius:8px}
.del:hover{color:var(--danger);background:rgba(251,113,133,.1)}
footer{margin-top:18px;color:var(--muted);font-size:12px;display:flex;justify-content:space-between}
@media(max-width:420px){body{padding:28px 14px}h1{font-size:22px}form{flex-direction:column}.add{width:100%}}
</style>
</head>
<body>
<main class="app">
  <header>
    <h1 data-testid="app-title">今日待办</h1>
    <p class="sub">把小事做完，今天就算赢。</p>
  </header>
  <form data-testid="todo-form">
    <input data-testid="todo-input" aria-label="待办内容" placeholder="添加一件小事…" autocomplete="off">
    <button data-testid="add-btn" class="add" type="submit">添加</button>
  </form>
  <p data-testid="empty-state" class="empty">还没有待办，先加一条吧。</p>
  <ul data-testid="todo-list"></ul>
  <footer><span><span data-testid="todo-count">0</span> 项未完成</span><span>数据已本地保存</span></footer>
</main>
<script>
(async function () {
  var store = window.__atoms && window.__atoms.storage;
  var KEY = 'app-state';
  var state = { todos: [] };
  var list = document.querySelector('[data-testid="todo-list"]');
  var empty = document.querySelector('[data-testid="empty-state"]');
  var count = document.querySelector('[data-testid="todo-count"]');
  var input = document.querySelector('[data-testid="todo-input"]');
  var form = document.querySelector('[data-testid="todo-form"]');

  function render() {
    list.innerHTML = '';
    empty.style.display = state.todos.length ? 'none' : 'block';
    state.todos.forEach(function (t) {
      var li = document.createElement('li');
      li.setAttribute('data-id', String(t.id));
      if (t.done) li.className = 'done';
      var check = document.createElement('button');
      check.type = 'button';
      check.className = 'check';
      check.setAttribute('data-action', 'toggle');
      check.setAttribute('aria-label', t.done ? '标记为未完成' : '标记为完成');
      check.textContent = t.done ? '✓' : '';
      var span = document.createElement('span');
      span.className = 'text';
      span.textContent = t.text;
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'del';
      del.setAttribute('data-action', 'delete');
      del.setAttribute('aria-label', '删除待办');
      del.textContent = '×';
      li.appendChild(check);
      li.appendChild(span);
      li.appendChild(del);
      list.appendChild(li);
    });
    var left = state.todos.filter(function (t) { return !t.done; }).length;
    count.textContent = String(left);
  }

  async function save() {
    try { if (store) await store.set(KEY, JSON.stringify(state)); } catch (e) {}
  }

  async function load() {
    try {
      var raw = store ? await store.get(KEY) : null;
      if (raw) state = JSON.parse(raw);
    } catch (e) { state = { todos: [] }; }
    if (!state || !Array.isArray(state.todos)) state = { todos: [] };
    render();
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    state.todos.unshift({ id: Date.now(), text: text, done: false });
    input.value = '';
    render();
    await save();
  });

  list.addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var row = btn.closest('[data-id]');
    var id = Number(row.getAttribute('data-id'));
    var action = btn.getAttribute('data-action');
    if (action === 'toggle') {
      state.todos = state.todos.map(function (t) {
        return t.id === id ? { id: t.id, text: t.text, done: !t.done } : t;
      });
    }
    if (action === 'delete') {
      state.todos = state.todos.filter(function (t) { return t.id !== id; });
    }
    render();
    await save();
  });

  await load();
})();
</script>
</body>
</html>`;

const HABIT_CODE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>习惯打卡</title>
<style>
:root{--bg:#0d1014;--panel:#161a21;--line:#252b36;--text:#e9edf3;--muted:#96a0b2;--accent:#60a5fa;--good:#34d399;--radius:14px}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(800px 480px at 85% -10%,#132845 0%,transparent 60%),var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans SC",sans-serif;display:flex;justify-content:center;padding:44px 18px}
.app{width:100%;max-width:560px}
h1{font-size:26px;margin:0 0 6px;letter-spacing:-.02em}
.sub{color:var(--muted);font-size:13px;margin:0 0 22px}
form{display:flex;gap:8px;margin-bottom:16px}
input{flex:1;min-width:0;background:var(--panel);border:1px solid var(--line);color:var(--text);padding:12px 14px;border-radius:12px;font-size:14px;outline:none}
input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(96,165,250,.14)}
button{cursor:pointer;font:inherit}
.add{background:var(--accent);color:#071627;border:none;padding:12px 18px;border-radius:12px;font-weight:700}
.empty{color:var(--muted);font-size:13px;text-align:center;padding:28px 0;border:1px dashed var(--line);border-radius:var(--radius)}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
li{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:14px}
.name{flex:1;font-size:14px;font-weight:600}
.meta{color:var(--muted);font-size:12px;margin-top:2px;font-weight:400}
.checkin{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.35);color:var(--good);padding:9px 12px;border-radius:10px;font-size:12px;font-weight:700}
.checkin.done{background:rgba(52,211,153,.2)}
@media(max-width:420px){body{padding:28px 14px}h1{font-size:22px}form{flex-direction:column}.add{width:100%}}
</style>
</head>
<body>
<main class="app">
  <h1 data-testid="app-title">习惯打卡</h1>
  <p class="sub">每天一小步，连续就是复利。</p>
  <form data-testid="habit-form">
    <input data-testid="habit-input" aria-label="习惯名称" placeholder="想坚持什么？例如：读书" autocomplete="off">
    <button data-testid="add-btn" class="add" type="submit">添加习惯</button>
  </form>
  <p data-testid="empty-state" class="empty">还没有习惯，先添加一个吧。</p>
  <ul data-testid="habit-list"></ul>
</main>
<script>
(async function () {
  var store = window.__atoms && window.__atoms.storage;
  var KEY = 'app-state';
  var state = { habits: [] };
  var list = document.querySelector('[data-testid="habit-list"]');
  var empty = document.querySelector('[data-testid="empty-state"]');
  var input = document.querySelector('[data-testid="habit-input"]');
  var form = document.querySelector('[data-testid="habit-form"]');

  function fmt(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function today() { return fmt(new Date()); }
  function streak(dates) {
    var set = {};
    dates.forEach(function (d) { set[d] = true; });
    var n = 0;
    var d = new Date();
    while (set[fmt(d)]) { n += 1; d.setDate(d.getDate() - 1); }
    return n;
  }
  function render() {
    list.innerHTML = '';
    empty.style.display = state.habits.length ? 'none' : 'block';
    var t = today();
    state.habits.forEach(function (h) {
      var li = document.createElement('li');
      li.setAttribute('data-id', String(h.id));
      var wrap = document.createElement('div');
      wrap.style.flex = '1';
      var name = document.createElement('div');
      name.className = 'name';
      name.setAttribute('data-testid', 'habit-name');
      name.textContent = h.name;
      var meta = document.createElement('div');
      meta.className = 'meta';
      var streakEl = document.createElement('span');
      streakEl.setAttribute('data-testid', 'streak');
      streakEl.textContent = '连续 ' + streak(h.dates) + ' 天';
      meta.appendChild(streakEl);
      meta.appendChild(document.createTextNode(' · 共 ' + h.dates.length + ' 次'));
      wrap.appendChild(name);
      wrap.appendChild(meta);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'checkin' + (h.dates.indexOf(t) >= 0 ? ' done' : '');
      btn.setAttribute('data-testid', 'checkin-btn');
      btn.setAttribute('data-action', 'checkin');
      btn.textContent = h.dates.indexOf(t) >= 0 ? '✓ 已打卡' : '今日打卡';
      li.appendChild(wrap);
      li.appendChild(btn);
      list.appendChild(li);
    });
  }
  async function save() {
    try { if (store) await store.set(KEY, JSON.stringify(state)); } catch (e) {}
  }
  async function load() {
    try {
      var raw = store ? await store.get(KEY) : null;
      if (raw) state = JSON.parse(raw);
    } catch (e) { state = { habits: [] }; }
    if (!state || !Array.isArray(state.habits)) state = { habits: [] };
    render();
  }
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = input.value.trim();
    if (!name) return;
    state.habits.unshift({ id: Date.now(), name: name, dates: [] });
    input.value = '';
    render();
    await save();
  });
  list.addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-action="checkin"]');
    if (!btn) return;
    var row = btn.closest('[data-id]');
    var id = Number(row.getAttribute('data-id'));
    var t = today();
    state.habits = state.habits.map(function (h) {
      if (h.id !== id) return h;
      var has = h.dates.indexOf(t) >= 0;
      return { id: h.id, name: h.name, dates: has ? h.dates.filter(function (d) { return d !== t; }) : h.dates.concat([t]) };
    });
    render();
    await save();
  });
  await load();
})();
</script>
</body>
</html>`;

const EXPENSE_CODE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>极简记账</title>
<style>
:root{--bg:#0f1113;--panel:#171a1e;--line:#282d34;--text:#eceef2;--muted:#98a0ad;--accent:#fbbf24;--danger:#fb7185;--radius:14px}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(760px 440px at 50% -12%,#3a2a0d 0%,transparent 60%),var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans SC",sans-serif;display:flex;justify-content:center;padding:44px 18px}
.app{width:100%;max-width:560px}
h1{font-size:26px;margin:0 0 6px;letter-spacing:-.02em}
.sub{color:var(--muted);font-size:13px;margin:0 0 22px}
form{display:flex;gap:8px;margin-bottom:16px}
input{min-width:0;background:var(--panel);border:1px solid var(--line);color:var(--text);padding:12px 14px;border-radius:12px;font-size:14px;outline:none}
input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(251,191,36,.12)}
#name{flex:2}#amount{flex:1}
button{cursor:pointer;font:inherit}
.add{background:var(--accent);color:#2a1c02;border:none;padding:12px 16px;border-radius:12px;font-weight:800}
.total{display:flex;align-items:baseline;justify-content:space-between;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:16px;margin:16px 0}
.total span{color:var(--muted);font-size:12px}
.total strong{font-size:26px;letter-spacing:-.02em}
.empty{color:var(--muted);font-size:13px;text-align:center;padding:26px 0;border:1px dashed var(--line);border-radius:var(--radius)}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
li{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:13px 14px}
li .name{flex:1;font-size:14px}
li .amt{font-size:14px;font-weight:700;color:var(--accent)}
.del{background:transparent;border:none;color:var(--muted);font-size:17px;padding:2px 6px;border-radius:8px}
.del:hover{color:var(--danger)}
@media(max-width:420px){body{padding:28px 14px}h1{font-size:22px}form{flex-wrap:wrap}#name{flex:1 1 100%}#amount{flex:1}.add{flex:1}}
</style>
</head>
<body>
<main class="app">
  <h1 data-testid="app-title">极简记账</h1>
  <p class="sub">今天花得明白，月底才不慌。</p>
  <form data-testid="expense-form">
    <input id="name" data-testid="expense-name" aria-label="消费名称" placeholder="花在哪了？" autocomplete="off">
    <input id="amount" data-testid="expense-amount" aria-label="金额" placeholder="金额" inputmode="decimal" autocomplete="off">
    <button data-testid="add-btn" class="add" type="submit">记一笔</button>
  </form>
  <div class="total"><span>本月支出</span><strong data-testid="total">¥0.00</strong></div>
  <p data-testid="empty-state" class="empty">还没有记录，记下第一笔吧。</p>
  <ul data-testid="expense-list"></ul>
</main>
<script>
(async function () {
  var store = window.__atoms && window.__atoms.storage;
  var KEY = 'app-state';
  var state = { items: [] };
  var list = document.querySelector('[data-testid="expense-list"]');
  var empty = document.querySelector('[data-testid="empty-state"]');
  var totalEl = document.querySelector('[data-testid="total"]');
  var nameInput = document.querySelector('[data-testid="expense-name"]');
  var amountInput = document.querySelector('[data-testid="expense-amount"]');
  var form = document.querySelector('[data-testid="expense-form"]');

  function render() {
    list.innerHTML = '';
    empty.style.display = state.items.length ? 'none' : 'block';
    state.items.forEach(function (item) {
      var li = document.createElement('li');
      li.setAttribute('data-id', String(item.id));
      var name = document.createElement('span');
      name.className = 'name';
      name.textContent = item.name;
      var amt = document.createElement('span');
      amt.className = 'amt';
      amt.textContent = '¥' + Number(item.amount).toFixed(2);
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'del';
      del.setAttribute('data-action', 'delete');
      del.setAttribute('aria-label', '删除记录');
      del.textContent = '×';
      li.appendChild(name);
      li.appendChild(amt);
      li.appendChild(del);
      list.appendChild(li);
    });
    var total = state.items.reduce(function (sum, item) { return sum + Number(item.amount || 0); }, 0);
    totalEl.textContent = '¥' + total.toFixed(2);
  }
  async function save() {
    try { if (store) await store.set(KEY, JSON.stringify(state)); } catch (e) {}
  }
  async function load() {
    try {
      var raw = store ? await store.get(KEY) : null;
      if (raw) state = JSON.parse(raw);
    } catch (e) { state = { items: [] }; }
    if (!state || !Array.isArray(state.items)) state = { items: [] };
    render();
  }
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = nameInput.value.trim();
    var amount = Number(amountInput.value);
    if (!name || !isFinite(amount) || amount <= 0) return;
    state.items.unshift({ id: Date.now(), name: name, amount: amount });
    nameInput.value = '';
    amountInput.value = '';
    render();
    await save();
  });
  list.addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-action="delete"]');
    if (!btn) return;
    var row = btn.closest('[data-id]');
    var id = Number(row.getAttribute('data-id'));
    state.items = state.items.filter(function (item) { return item.id !== id; });
    render();
    await save();
  });
  await load();
})();
</script>
</body>
</html>`;

export const DEMO_APPS: DemoApp[] = [
  {
    id: "todo",
    title: "今日待办",
    tagline: "最经典的小应用，拿来验证生成与持久化主链路。",
    prompt: "做一个简洁的待办清单，支持添加、完成、删除，刷新后数据不丢。",
    spec: {
      name: "今日待办",
      summary: "一个离线可用的待办清单，支持添加、完成、删除与本地持久化。",
      features: ["添加待办", "切换完成状态", "删除待办", "刷新后保留数据"],
      checks: [
        { id: "c1", description: "页面标题可见", kind: "visible", selector: '[data-testid="app-title"]' },
        { id: "c2", description: "输入待办内容", kind: "input", selector: '[data-testid="todo-input"]', value: "买牛奶" },
        { id: "c3", description: "点击添加按钮", kind: "click", selector: '[data-testid="add-btn"]' },
        { id: "c4", description: "新待办出现在列表中", kind: "expectText", selector: '[data-testid="todo-list"]', expect: "买牛奶" },
        { id: "c5", description: "数据写入持久化存储", kind: "expectStorage", storageKey: "app-state", expect: "买牛奶" },
        { id: "c6", description: "无运行时错误", kind: "noRuntimeErrors" },
      ],
    },
    code: TODO_CODE,
  },
  {
    id: "habit",
    title: "习惯打卡",
    tagline: "带连续天数计算，适合演示交互 + 状态派生。",
    prompt: "做一个习惯打卡应用，可以添加习惯、每日打卡，并显示连续打卡天数。",
    spec: {
      name: "习惯打卡",
      summary: "添加习惯并每日打卡，实时计算连续天数，数据本地持久化。",
      features: ["添加习惯", "每日打卡", "连续天数统计", "数据持久化"],
      checks: [
        { id: "c1", description: "页面标题可见", kind: "visible", selector: '[data-testid="app-title"]' },
        { id: "c2", description: "输入习惯名称", kind: "input", selector: '[data-testid="habit-input"]', value: "读书" },
        { id: "c3", description: "点击添加习惯", kind: "click", selector: '[data-testid="add-btn"]' },
        { id: "c4", description: "习惯出现在列表中", kind: "expectText", selector: '[data-testid="habit-list"]', expect: "读书" },
        { id: "c5", description: "点击今日打卡", kind: "click", selector: '[data-testid="checkin-btn"]' },
        { id: "c6", description: "打卡状态更新", kind: "expectText", selector: '[data-testid="checkin-btn"]', expect: "已打卡" },
        { id: "c7", description: "打卡数据写入存储", kind: "expectStorage", storageKey: "app-state", expect: "读书" },
        { id: "c8", description: "无运行时错误", kind: "noRuntimeErrors" },
      ],
    },
    code: HABIT_CODE,
  },
  {
    id: "expense",
    title: "极简记账",
    tagline: "两个输入 + 聚合计算，覆盖表单与数值场景。",
    prompt: "做一个极简记账应用，输入名称和金额，自动汇总总支出，数据刷新后保留。",
    spec: {
      name: "极简记账",
      summary: "记录每笔支出并自动汇总，支持删除与本地持久化。",
      features: ["记录支出", "自动汇总", "删除记录", "数据持久化"],
      checks: [
        { id: "c1", description: "页面标题可见", kind: "visible", selector: '[data-testid="app-title"]' },
        { id: "c2", description: "输入消费名称", kind: "input", selector: '[data-testid="expense-name"]', value: "咖啡" },
        { id: "c3", description: "输入金额", kind: "input", selector: '[data-testid="expense-amount"]', value: "25" },
        { id: "c4", description: "点击记一笔", kind: "click", selector: '[data-testid="add-btn"]' },
        { id: "c5", description: "记录出现在列表中", kind: "expectText", selector: '[data-testid="expense-list"]', expect: "咖啡" },
        { id: "c6", description: "总支出自动汇总", kind: "expectText", selector: '[data-testid="total"]', expect: "25" },
        { id: "c7", description: "记录写入持久化存储", kind: "expectStorage", storageKey: "app-state", expect: "咖啡" },
        { id: "c8", description: "无运行时错误", kind: "noRuntimeErrors" },
      ],
    },
    code: EXPENSE_CODE,
  },
];
