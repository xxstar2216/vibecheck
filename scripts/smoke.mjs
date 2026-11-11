import { chromium } from "playwright-core";

const url = process.env.APP_URL || "http://localhost:3000";
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await chromium.launch({ headless: true, executablePath: edge });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: { "ngrok-skip-browser-warning": "true" },
});
const page = await context.newPage();
const errors = [];

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.goto(url, { waitUntil: "networkidle" });
console.log("title:", await page.title());
console.log("hero:", await page.getByText("让 AI 生成的应用，").count());
await page.screenshot({ path: "scripts/01-landing.png" });

const cards = page.getByRole("button", { name: /今日待办/ });
console.log("todo template buttons:", await cards.count());
await cards.first().click();

await page.getByText("质量门禁通过").waitFor({ timeout: 30000 });
console.log("gate passed");
const reportText = await page.locator("main").innerText();
console.log("report excerpt:", reportText.slice(0, 300).replace(/\n+/g, " | "));
console.log("score 100:", await page.getByText("100", { exact: true }).count());
await page.screenshot({ path: "scripts/02-quality.png" });

await page.getByRole("button", { name: /^预览/ }).first().click();
await page.waitForTimeout(600);
const frame = page.frameLocator('iframe[title="应用预览"]');
console.log("app title:", await frame.getByTestId("app-title").innerText());

await frame.getByTestId("todo-input").fill("测试持久化");
await frame.getByTestId("add-btn").click();
await page.waitForTimeout(900);
console.log(
  "list after add:",
  (await frame.getByTestId("todo-list").innerText()).replace(/\n+/g, " / "),
);

await page.getByLabel("刷新预览").click();
await page.waitForTimeout(1400);
const frame2 = page.frameLocator('iframe[title="应用预览"]');
console.log(
  "list after reload:",
  (await frame2.getByTestId("todo-list").innerText()).replace(/\n+/g, " / "),
);
await page.screenshot({ path: "scripts/03-preview.png" });

console.log("errors:", JSON.stringify(errors, null, 2));
await browser.close();
