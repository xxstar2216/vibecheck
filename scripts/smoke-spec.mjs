import { chromium } from "playwright-core";

const url = process.env.APP_URL || "http://localhost:3004";
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await chromium.launch({ headless: true, executablePath: edge });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.locator("textarea").first().fill("做一个 Mock 待办，支持添加和持久化");
await page.getByRole("button", { name: "生成", exact: true }).click();

await page.getByText("Spec Agent · 等待确认").waitFor({ timeout: 60000 });
console.log("spec confirmation card visible");
console.log("acceptance checks:", await page.locator("text=/^✓|Spec Agent/").count());
await page.screenshot({ path: "scripts/v2-spec-confirm.png" });

await page.getByRole("button", { name: "确认并生成代码" }).click();
await page.getByText("质量门禁通过").waitFor({ timeout: 120000 });
console.log("after confirm: gate passed");
console.log("score 100:", await page.locator("main").getByText("100", { exact: true }).count());
console.log("team trace:", (await page.locator("section").first().innerText()).includes("QA Agent"));
console.log("errors:", JSON.stringify(errors.slice(0, 10)));
await page.screenshot({ path: "scripts/v2-spec-result.png" });
await browser.close();
