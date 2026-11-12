import { chromium } from "playwright-core";

const base = process.env.APP_URL || "http://localhost:3003";
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const email = `v2-${Date.now()}@example.com`;
const password = "password123";
const name = "评测用户";

const browser = await chromium.launch({ headless: true, executablePath: edge });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ["clipboard-read", "clipboard-write"],
  extraHTTPHeaders: { "ngrok-skip-browser-warning": "true" },
});
const page = await context.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(base, { waitUntil: "networkidle" });
console.log(
  "guest header login:",
  await page.locator("header").getByRole("link", { name: /登录 \/ 注册/ }).count(),
);

await page.locator("header").getByRole("link", { name: /登录 \/ 注册/ }).click();
await page.waitForURL((u) => u.pathname === "/login", { timeout: 10000 });
await page.getByRole("button", { name: "注册", exact: true }).click();
await page.locator('input[autocomplete="nickname"]').fill(name);
await page.locator('input[type="email"]').fill(email);
await page.locator('input[type="password"]').fill(password);
await page.locator("form button[type=submit]").click();
await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });
await page.getByText(name).first().waitFor({ timeout: 10000 });
console.log("registered:", email);

await page.getByRole("button", { name: /今日待办/ }).first().click();
await page.getByText("质量门禁通过").waitFor({ timeout: 30000 });
console.log("template gate passed");

const serverProjects = await page.evaluate(() =>
  fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()),
);
console.log("server projects:", serverProjects.projects?.length, serverProjects.projects?.[0]?.name);

await page.reload({ waitUntil: "networkidle" });
await page.locator("aside").getByText("今日待办").first().waitFor({ timeout: 15000 });
console.log("project persisted after reload");

await page.getByRole("button", { name: "代码", exact: true }).click();
await page.getByRole("button", { name: "编辑", exact: true }).click();
const editor = page.locator("main textarea");
const code = await editor.inputValue();
await editor.fill(`${code}\n<!-- manual edit by smoke-v2 -->`);
await page.getByRole("button", { name: "保存并验收", exact: true }).click();
await page.getByText("质量门禁通过").waitFor({ timeout: 30000 });
console.log("manual edit saved and re-verified");

await page.getByRole("button", { name: "版本", exact: true }).click();
await page.getByText("手动编辑").first().waitFor({ timeout: 10000 });
console.log("version history has manual edit");

await page.getByRole("button", { name: "代码", exact: true }).click();
await page.getByRole("button", { name: "对比上一版", exact: true }).click();
await page.getByText("版本对比").waitFor({ timeout: 10000 });
console.log("version diff opened");
await page.getByRole("button", { name: "关闭", exact: true }).click();

const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 15000 }),
  page.getByRole("button", { name: /下载 ZIP/ }).click(),
]);
console.log("zip download:", download.suggestedFilename());

await page.getByRole("button", { name: /^预览/ }).first().click();
await page.getByLabel("分享预览").click();
await page.getByText("分享生成的应用").waitFor({ timeout: 15000 });
const shareUrl = await page
  .locator("span")
  .filter({ hasText: "/share/" })
  .first()
  .innerText();
console.log("share url:", shareUrl);
await page.screenshot({ path: "scripts/v2-share.png" });

const shared = await context.newPage();
await shared.goto(shareUrl, { waitUntil: "networkidle" });
await shared.getByText("由 VibeCheck 生成").waitFor({ timeout: 15000 });
const sharedFrame = shared.frameLocator("iframe");
console.log("share app title:", await sharedFrame.getByTestId("app-title").innerText({ timeout: 10000 }));
await shared.screenshot({ path: "scripts/v2-shared-app.png" });
await shared.close();

await page.getByRole("button", { name: "关闭", exact: true }).click();

await page.getByLabel("全屏预览").click();
await page.getByText("全屏预览").waitFor({ timeout: 10000 });
console.log("fullscreen preview opened");
await page.getByRole("button", { name: /退出全屏/ }).click();

const [popup] = await Promise.all([
  context.waitForEvent("page", { timeout: 15000 }),
  page.getByLabel("新标签页打开").click(),
]);
await popup.waitForURL(/\/share\//, { timeout: 15000 });
console.log("new tab share:", popup.url().includes("/share/"));
await popup.close();

await page.getByLabel("退出登录").click();
await page.locator("header").getByRole("link", { name: /登录 \/ 注册/ }).waitFor({ timeout: 10000 });
console.log("logout -> guest");

await page.locator("header").getByRole("link", { name: /登录 \/ 注册/ }).click();
await page.waitForURL((u) => u.pathname === "/login", { timeout: 10000 });
await page.locator('input[type="email"]').fill(email);
await page.locator('input[type="password"]').fill(password);
await page.locator("form button[type=submit]").click();
await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });
await page.locator("aside").getByText("今日待办").first().waitFor({ timeout: 15000 });
console.log("login again -> server project restored");

console.log("errors:", JSON.stringify(errors.slice(0, 10)));
await browser.close();
