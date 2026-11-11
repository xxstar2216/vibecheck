import { chromium } from "playwright-core";

const url = process.env.APP_URL || "http://localhost:3004";
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await chromium.launch({ headless: true, executablePath: edge });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(url, { waitUntil: "networkidle" });
const health = await page.evaluate(() => fetch("/api/health").then((r) => r.json()));
console.log("health:", JSON.stringify(health));

await page.locator("textarea").fill("做一个 Mock 待办，支持添加和持久化");
await page.getByRole("button", { name: "生成", exact: true }).click();

await page.getByText(/预计 60-90s/).first().waitFor({ timeout: 5000 }).catch(() => {
  console.log("ETA hint not seen (may have already finished)");
});

await page.locator("main").getByText("已阻止交付").first().waitFor({ timeout: 120000 });
console.log("first gate blocked");

const repairButton = page.getByRole("button", { name: "继续修复", exact: true });
console.log("repair button visible:", await repairButton.isVisible());
await repairButton.click();

await page.locator("main").getByText("质量门禁通过").first().waitFor({ timeout: 120000 });
console.log("manual repair passed");
console.log("score 100:", await page.locator("main").getByText("100", { exact: true }).count());

const copyButton = page.getByRole("button", { name: /复制报告摘要/ });
await copyButton.click();
await page.getByText("已复制").first().waitFor({ timeout: 3000 });
const clip = await page.evaluate(() => navigator.clipboard.readText());
console.log("clipboard markdown:", clip.slice(0, 80).replace(/\n+/g, " | "));
console.log("clipboard has report:", clip.includes("质量报告"));
console.log("clipboard has gate:", clip.includes("质量门禁") || clip.includes("门禁"));

await page.getByRole("button", { name: "版本", exact: true }).click();
await page.waitForTimeout(300);
const versions = await page.locator("main").innerText();
console.log("versions has manual repair note:", versions.includes("根据失败报告继续修复"));

await page.screenshot({ path: "scripts/repair-button.png" });
console.log("console errors:", JSON.stringify(errors.slice(0, 8)));
await browser.close();
