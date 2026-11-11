import { chromium } from "playwright-core";

const url = process.env.APP_URL || "http://localhost:3002";
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await chromium.launch({ headless: true, executablePath: edge });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(url, { waitUntil: "networkidle" });
const health = await page.evaluate(() => fetch("/api/health").then((r) => r.json()));
console.log("health:", JSON.stringify(health));

await page.locator("textarea").fill("做一个 Mock 待办，支持添加和持久化");
await page.getByRole("button", { name: "生成", exact: true }).click();
await page.getByText("质量门禁通过").waitFor({ timeout: 60000 });

const text = await page.locator("main").innerText();
console.log("gate passed:", text.includes("质量门禁通过"));
console.log("score 100:", await page.getByText("100", { exact: true }).count());
console.log("repair mentioned:", (await page.locator("section").first().innerText()).includes("自动修复"));
console.log("report excerpt:", text.slice(0, 240).replace(/\n+/g, " | "));
await page.screenshot({ path: "scripts/live-generation.png" });
console.log("errors:", JSON.stringify(errors));
await browser.close();
