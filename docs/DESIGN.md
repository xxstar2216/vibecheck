# VibeCheck 设计说明

> 在线体验：https://expulsion-lifting-urging.ngrok-free.dev  
> 源码：https://github.com/xxstar2216/vibecheck  
> 提交人：`pxx`

## 1. 一句话定位

**VibeCheck 是一个“会自我验收”的 AI 应用生成器：生成是入口，质量闭环才是产品。**

用户输入一句话，Agent 先产出可执行的验收标准，再生成单文件 Web 应用，随后在隔离沙箱里逐条执行验收；失败自动修复一次，通过质量门禁才交付。

## 2. 我如何理解这道题

题目要的不是“用 Atoms 做 Atoms”，而是看候选人能否借助 AI 在 6-8 小时内交付一个**可运行、可体验、可扩展**的产品原型。评估维度是完成度、工程思维、用户体验、创新性和可交付性。

绝大多数提交会是“聊天框 + iframe 预览”。要形成记忆点，必须回答一个问题：**AI 生成的应用，凭什么让人放心用？**

我的答案是把 QA 的验收标准前置成生成协议：

- 不是“生成完再人肉点一遍”，而是先生成可执行用例，再写代码
- 不是“发现问题就重试”，而是带着结构化失败报告做一次定向修复
- 不是“测试是一次性的”，而是把用例导出成 Playwright，变成可回归的资产

这也正好对应岗位 JD 里的“让每一次生成更可靠、每一次发布更安全”。

## 3. 核心流程

```
描述需求
  → Spec Agent：应用规格 + 4-6 条可执行验收标准（JSON）
  → Code Agent：流式生成单文件 HTML（契约：data-testid / app-state / 无外部依赖）
  → 静态检查：文档完整性、viewport、testid、存储桥、响应式、体积、外部依赖
  → 沙箱验收：注入探针，逐条执行 visible / input / click / expectText / expectStorage
  → 质量评分
      ├─ 通过（≥80 且零运行时错误）→ 存版本 → 交付
      └─ 未通过 → 带失败报告自动修复 1 次 → 重新验收 → 存版本
  → 迭代：复用原验收标准做回归，保留版本历史
  → 导出：HTML / 报告 JSON / Playwright spec
```

## 4. 架构

- **前端**：Next.js 15 App Router + React 19 + TypeScript + Tailwind 4
- **服务端**：Route Handlers（`/api/spec`、`/api/generate`、`/api/repair`、`/api/health`、`/api/auth/*`、`/api/projects`、`/api/share`）
- **认证**：邮箱 + 密码（scrypt）+ HttpOnly 会话 Cookie；访客模式免登录
- **模型**：任意 OpenAI Chat Completions 兼容服务，默认 DeepSeek；密钥只在服务端
- **预览**：`iframe srcdoc`，`sandbox="allow-scripts allow-forms"`（不透明源）
- **验收**：独立的离屏 iframe（1024×768）注入 runner，通过 `postMessage` 回传结果
- **存储**：访客用 IndexedDB；登录用户用服务端 SQLite（`node:sqlite`）保存项目 / 版本 / 报告
- **分享**：公开快照页 `/share/[id]` + 二维码
- **部署**：本地 / 香港 VPS（SQLite 需要持久磁盘）；Vercel Serverless 需换 Postgres

```
Browser
├─ Workspace (state machine + Agent Trace)
│  ├─ ChatPanel            ← 需求 / Trace / 消息 / Spec 确认
│  ├─ QualityPanel         ← 分数 / 证据 / 导出
│  ├─ CodePanel            ← 代码 / 编辑 / diff / ZIP
│  ├─ PreviewFrame         ← 可见预览（注入错误探针 + 存储桥）
│  ├─ TestRunnerFrame      ← 离屏验收 iframe（注入 harness）
│  └─ ShareModal           ← 分享页 / 二维码 / 新标签 / 全屏
├─ IndexedDB               ← 访客 projects / versions / appData
└─ postMessage             ← storage-get/set/remove、atoms-tests-complete

Server (Next.js Route Handlers)
├─ /api/spec /generate /repair → 模型流水线
├─ /api/auth/*        → 注册 / 登录 / 登出 / me
├─ /api/projects      → 登录用户项目/版本读写
├─ /api/share         → 公开分享快照
└─ /api/health        → 是否配置模型
SQLite (node:sqlite)  → users / sessions / projects / shares / app_data
```

## 5. 关键决策

### ADR-1 生成单文件 HTML，而不是完整工程

**背景**：6-8 小时的预算，要保证“生成 → 预览 → 验收”尽快闭环；多文件工程需要构建沙箱、依赖安装和模块解析，会显著拉长反馈链路。

**决策**：约束模型输出一份完整 HTML（内联 CSS/JS），用 `srcdoc` 直接渲染；模板秒级打开，真实生成耗时主要取决于模型。

**代价**：无法表达多文件、路由、依赖复杂的应用；代码规模受 40KB 约束。

**为什么现在可以接受**：Demo 的价值在于验证“生成质量闭环”，而不是复刻完整 IDE。下一步可用 WebContainer 接多文件工程。

### ADR-2 不透明源 sandbox + postMessage 存储桥

**背景**：AI 生成的代码不可信；同时题目要求数据持久化。

**决策**：`sandbox="allow-scripts allow-forms"`，不加 `allow-same-origin`。这样 iframe 的 origin 是 opaque，生成代码无法访问父页面 DOM/Cookie。由于 opaque origin 下 `localStorage` 会抛 `SecurityError`，注入 `window.__atoms.storage` 桥，把读写交给父页面落到 IndexedDB。

**代价**：桥有 2 秒超时和额外一次消息往返；生成代码必须遵守存储契约。

**收益**：沙箱隔离与“生成应用刷新后数据还在”同时成立，这也是一个能讲清楚的工程取舍。

### ADR-3 浏览器内 mini-runner，而不是服务端 Playwright

**背景**：验收要在生成后立即执行，且部署成本要低。

**决策**：把验收 DSL（visible / input / click / expectText / expectStorage / noRuntimeErrors）编译成一段注入 iframe 的 JS，在浏览器里顺序执行；结果用 `postMessage` 回传。

**代价**：没有真实导航、网络拦截和跨页能力，可信度低于 Playwright；选择器错误时只能靠 `data-testid` 契约兜底。

**收益**：零基础设施、零冷启动，反馈在秒级；同时把同一组验收导出成 Playwright spec，保留“升级到真实 E2E”的路径。

### ADR-4 IndexedDB，而不是服务端数据库

**背景**：题目明确“无需注册”，且 Demo 要能公开访问。

**决策**：项目、版本和生成应用数据全部存浏览器 IndexedDB；服务端无状态。

**代价**：不跨设备、不共享；换浏览器即丢失。

**收益**：零账号、零数据库成本、零隐私上传；评审打开链接即可用。

### ADR-5 只自动修复一次，编辑时复用原验收标准

**背景**：修复是成本与延迟的主要来源；编辑后的回归同样重要。

**决策**：质量门禁失败后最多修复 1 轮；编辑时沿用原 spec 的验收标准做回归，不重新生成 spec。

**代价**：复杂失败可能修不好；新增功能没有自动扩展验收项。

**收益**：单次生成的成本与时间可控；编辑不会悄悄丢掉旧能力。下一步可以加“按 diff 扩展验收标准”和“带预算的多轮修复”。

### ADR-6 访客 + 可选账号

**背景**：笔试原文说“无需注册功能”，但面试评分表把“注册登录”作为独立项并给了 0/5。正确解法不是争论口径，而是同时满足两边。

**决策**：默认访客模式，所有生成/验收/预览能力不登录可用；登录是可选增强，登录后项目/版本/报告写服务端 SQLite，跨浏览器继续。

**代价**：需要维护两套存储路径（IndexedDB / 服务端）；账号体系增加了会话、密码哈希和权限校验。

**收益**：不登录也能完整体验（满足原文），评分表能看到真实的注册/登录/会话/登出；项目持久化从“本机”升级为“账号级”。

### ADR-7 服务端 SQLite 持久化

**背景**：原来的 IndexedDB 只能证明“刷新不丢”，不能证明“换浏览器/换设备还能继续”，评分表的数据持久化只给 3/5。

**决策**：用 Node 24 内置的 `node:sqlite` 建 users / sessions / projects / shares / app_data；登录用户的项目以 JSON 存 `projects` 表，分享用 `shares` 快照表。

**代价**：SQLite 是单实例文件库，需要持久磁盘；Vercel Serverless 不能直接用，要换 Postgres。账号没有邮箱验证/找回密码/第三方登录。

**收益**：注册 → 创建项目 → 刷新/重登/换浏览器都能恢复；分享是公开快照，不依赖登录；零外部数据库依赖，适合本地/VPS 演示。

## 6. 质量评分规则

| 维度 | 权重 | 规则 |
| --- | --- | --- |
| 运行时 | 30 | 零错误得 30；每个错误扣 10，最低 0 |
| 验收通过率 | 40 | 非运行时用例通过率 × 40 |
| 可访问性 | 15 | 15 - 每个 fail×5 - 每个 warn×1 |
| 韧性 | 15 | 15 - 每个 fail×4 - 每个 warn×1.5 |

放行：`score >= 80 && runtimeIssues.length === 0 && !timedOut`。

权重是产品决策，不是真理：运行时和验收占 70%，因为这两类问题最直接影响“能不能用”；A11y 与韧性用于拉开质量差距。规则与证据都在报告里可见，方便用户质疑和调整。

## 7. 完成度

**实测（2026-11-11，deepseek-flash）**

- Prompt：待办清单（添加 / 完成 / 删除 / 刷新后保留）
- 首版未通过 → 自动修复 1 次 → **100/100，7/7 项验收通过**
- 端到端约 76s（含两次生成 + 两次沙箱验收）
- 最终版本在独立沙箱复测：零控制台错误，刷新后数据仍在

**v2 补强（2026-11-12，根据面试反馈）**

- 注册登录：访客 + 可选邮箱账号；注册/登录/登出/会话；登录后项目云端同步
- 数据持久化：服务端 SQLite 保存项目/版本/报告；换浏览器、重登可继续
- 代码管理：在线编辑、保存为新版本、版本 diff、ZIP 导出（HTML/报告/Playwright）
- 产物预览：公开分享页 + 二维码 + 新标签页 + 全屏
- Agent 交互：Spec/Build/QA/Gate 多角色；生成前 Spec 确认；生成后后续建议
- 页面：登录页、账号态、Agent 团队条、完整预览工具栏
- 验证：`smoke:v2` 与 `smoke:spec` 全过，控制台零错误；3 个模板仍 100/100

**已完成**

- 生成 / 编辑 / 版本 / 回滚查看
- Spec → Code → Test → Repair 完整 Agent Trace
- 四类质量检查与评分、放行/阻止判定
- 失败自动修复 1 次；仍不达标可一键继续修复
- 质量报告 Markdown 摘要一键复制
- 沙箱隔离 + 存储桥 + 刷新持久化
- 3 个预置模板（无 Key 可体验）
- 导出 HTML / 报告 JSON / Playwright / ZIP
- 访客 + 可选账号；服务端 SQLite 云持久化
- 在线编辑 / 版本 diff / 分享页 / 二维码 / 全屏 / 新标签页
- 多角色 Agent + Spec 确认 + 后续建议
- 移动端可用、错误态、空状态、流式生成、停止生成
- 服务端 Key、每 IP 限额、静态检查

**未完成 / 已知限制**

- 失败的首版不入版本历史，只保留最终版本与 Trace 证据
- 编辑不自动扩展验收标准
- 限流是单实例内存实现
- 分享是公开快照：没有权限管理、撤回、密码
- 账号没有邮箱验证、找回密码、第三方登录
- SQLite 是单实例文件库，适合本地/VPS；Serverless 需换 Postgres
- 没有多人协作、真实部署生成物
- 单文件生成，不支持多文件工程与依赖

## 8. 下一步优先级

**P0（继续投入 1-2 天）**

1. 20 条 golden prompt 的评估集：记录生成成功率、首次通过率、修复率、单次成本
2. 把导出的 Playwright 用例接进 CI，验证“质量资产”真的可回归
3. 失败首版入版本历史，支持 diff 对比

**P1（一周）**

4. 多文件工程 + WebContainer 预览
5. 分享权限/撤回；邮箱验证
6. 用 Upstash Redis 替换内存限流，加成本看板

**P2（持续）**

7. 视觉回归（截图 diff）
8. 模型 A/B 与自动路由
9. 生成物一键部署（Vercel API）
10. 线上遥测：生成耗时、失败分类、逃逸缺陷

## 9. AI 协作说明（提交前补充）

- 使用的工具与版本：`<Cursor / Claude Code / Codex / ...>`
- 模型与账单：`<xxx 刀/月，附截图>`
- 我让 AI 做了什么：脚手架、组件、提示词初稿、测试脚本
- **我否决了 AI 的哪些建议**：`<例如：不加 allow-same-origin；不做登录；不做多文件；只修一轮>`
- 我手动修的关键问题：`<例如：opaque origin 下 localStorage 不可用；流式预览抖动；Vercel 函数超时>`

## 10. 评分维度对照

| 维度 | 证据 |
| --- | --- |
| 完成度 | 在线链接可完整走通；3 个模板 100 分；自动修复链路已验证 |
| 工程思维 | 5 条 ADR；单文件/沙箱/runner/存储/修复轮次的取舍 |
| 用户体验 | 三步上手；Agent Trace；流式生成；质量报告有证据；移动端可用 |
| 创新性 | 生成即验收；失败自动修复；验收用例可导出为 Playwright |
| 可交付性 | README、部署说明、smoke 脚本、报告 JSON、复现步骤 |
