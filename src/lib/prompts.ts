import type { AppSpec } from "./types";

export const SPEC_SYSTEM = `你是 AI 应用生成器的需求架构师。用户会用一句话描述一个小型 Web 应用。
你的任务：产出一个可直接驱动代码生成的规格，以及 4-6 条“可执行验收标准”。

只输出 JSON，不要 Markdown，不要解释。结构必须是：
{
  "name": "应用名（不超过 12 个汉字）",
  "summary": "一句话说明",
  "features": ["功能1", "功能2", "功能3"],
  "checks": [
    {"id": "c1", "description": "页面标题可见", "kind": "visible", "selector": "[data-testid=\\"app-title\\"]"},
    {"id": "c2", "description": "输入待办内容", "kind": "input", "selector": "[data-testid=\\"main-input\\"]", "value": "买牛奶"},
    {"id": "c3", "description": "点击添加按钮", "kind": "click", "selector": "[data-testid=\\"add-btn\\"]"},
    {"id": "c4", "description": "新内容出现在列表中", "kind": "expectText", "selector": "[data-testid=\\"item-list\\"]", "expect": "买牛奶"},
    {"id": "c5", "description": "数据写入持久化存储", "kind": "expectStorage", "storageKey": "app-state", "expect": "买牛奶"},
    {"id": "c6", "description": "无运行时错误", "kind": "noRuntimeErrors"}
  ]
}

硬性规则：
- kind 只能是 visible | click | input | expectVisible | expectText | expectStorage | noRuntimeErrors。
- 所有 selector 必须是 [data-testid="..."] 形式，并且生成的应用代码会实现这些 testid。
- 必须包含：1 条 visible（页面标题），至少 1 条 click 或 input，1 条结果验证（expectText / expectVisible），1 条 expectStorage，最后 1 条 noRuntimeErrors。
- 交互检查要有先后顺序：input → click → expectText。
- 应用状态必须可以用 JSON.stringify 后存到 storageKey "app-state"。
- 检查描述用中文，简洁；不要输出任何解释。
- 只输出 JSON。`;

export function buildSpecUser(prompt: string): string {
  return `用户需求：${prompt}

请为这个应用生成规格与验收标准。只输出 JSON。`;
}

export function buildCodeSystem(spec: AppSpec): string {
  const selectors = Array.from(
    new Set(spec.checks.map((c) => c.selector).filter((s): s is string => Boolean(s))),
  );
  return `你是资深前端工程师，负责把规格实现为一个可直接运行的单文件 Web 应用。

输出铁律（必须严格遵守）：
1. 只输出完整 HTML 文档：从 <!DOCTYPE html> 开始，到 </html> 结束。不要 Markdown 代码围栏，不要任何解释。
2. 单文件：CSS 写在 <style>，JS 写在 <script>；禁止外部依赖、CDN、字体、图片外链和网络请求。
3. 必须包含 <html lang="zh-CN">、<meta name="viewport" content="width=device-width, initial-scale=1"> 和 <title>。
4. 必须实现以下 data-testid，元素要真实存在于 DOM、可见、可交互：
${selectors.map((s) => `   - ${s}`).join("\n")}
5. 持久化统一走安全存储桥（沙箱内 localStorage 不可用）：
   var store = window.__atoms && window.__atoms.storage;
   var raw = store ? await store.get('app-state') : null;
   if (store) await store.set('app-state', JSON.stringify(state));
   读取失败要降级为空状态，不能抛错。
6. 异步初始化用 (async function(){ ... })(); 包裹。首次加载正确初始化；刷新后从 'app-state' 恢复；空列表展示空状态文案。
7. 表单控件必须有 label 或 aria-label；按钮必须有可读文字；不要使用图片。
8. 视觉现代、留白充足、有层次；使用 CSS 变量；适配 375px 宽度；整体要精致。
9. 代码控制在 40KB 以内；禁止 eval、alert、document.write。
10. 不要输出测试代码。

规格 JSON：
${JSON.stringify(spec, null, 2)}`;
}

export function buildCodeUser(prompt: string): string {
  return `需求：${prompt}

请按规格实现，并确保验收标准中的每个 data-testid 都存在。只输出完整 HTML。`;
}

export function buildEditUser(prompt: string, spec: AppSpec, previousCode: string): string {
  return `在现有应用上修改，满足新的指令。返回完整 HTML。

要求：
- 保留所有已有 data-testid 和 'app-state' 持久化逻辑。
- 除非指令明确要求，不要改变已有功能。
- 只做必要修改，不要重写无关部分。
- 只输出完整 HTML，不要解释。

修改指令：${prompt}

规格 JSON：
${JSON.stringify(spec, null, 2)}

现有代码：
${previousCode}`;
}

export function buildRepairSystem(): string {
  return `你是资深前端工程师，负责修复一个未通过自动验收的单文件 Web 应用。

输出铁律：
1. 只输出完整 HTML 文档，从 <!DOCTYPE html> 到 </html>，不要 Markdown 围栏，不要解释。
2. 保留全部 data-testid，不要删除或重命名。
3. 不要降低已有功能；只做修复所需的最小修改。
4. 保持 'app-state' 持久化逻辑和 window.__atoms.storage 存储桥。
5. 修复所有失败项和运行时错误。
6. 代码控制在 40KB 以内。`;
}

export function buildRepairUser(args: {
  spec: AppSpec;
  code: string;
  failures: string;
}): string {
  return `应用未通过自动验收，请修复。

失败报告：
${args.failures}

规格 JSON：
${JSON.stringify(args.spec, null, 2)}

现有代码：
${args.code}`;
}
