import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const url = process.env.APP_URL || "http://localhost:3000";
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
mkdirSync("docs/screenshots", { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: edge });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route("**/api/health", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, configured: true, model: "deepseek-chat" }),
  }),
);

await page.goto(url, { waitUntil: "networkidle" });
await page.screenshot({ path: "docs/screenshots/01-landing.png" });

await page.getByRole("button", { name: /今日待办/ }).first().click();
await page.getByText("质量门禁通过").waitFor({ timeout: 30000 });
await page.screenshot({ path: "docs/screenshots/02-quality.png" });

await page.getByRole("button", { name: /^预览/ }).first().click();
await page.waitForTimeout(600);
const frame = page.frameLocator('iframe[title="应用预览"]');
await frame.getByTestId("todo-input").fill("写周报");
await frame.getByTestId("add-btn").click();
await page.waitForTimeout(500);
await page.screenshot({ path: "docs/screenshots/03-preview.png" });

await page.getByRole("button", { name: "代码", exact: true }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "docs/screenshots/04-code.png" });

await page.getByRole("button", { name: "版本", exact: true }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "docs/screenshots/05-versions.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: /^预览/ }).first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: "docs/screenshots/06-mobile.png" });

await browser.close();
console.log("screenshots written to docs/screenshots/");
