import fs from "node:fs";
import { chromium } from "playwright-core";

const url = process.env.APP_URL || "http://localhost:3003";
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await chromium.launch({ headless: true, executablePath: edge });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(url, { waitUntil: "networkidle" });
const health = await page.evaluate(() => fetch("/api/health").then((r) => r.json()));
console.log("health:", JSON.stringify(health));

const prompt = "做一个简洁的待办清单，支持添加、完成、删除，刷新后数据不丢。";
await page.locator("textarea").fill(prompt);
const started = Date.now();
await page.getByRole("button", { name: "生成", exact: true }).click();

let gate = false;
try {
  await page
    .locator("main")
    .getByText(/质量门禁通过|已阻止交付/)
    .first()
    .waitFor({ timeout: 240000 });
  gate = true;
} catch {
  console.log("gate text not found within 240s");
}
console.log("elapsed:", `${Math.round((Date.now() - started) / 1000)}s`, "gate:", gate);

const mainText = await page.locator("main").innerText();
console.log("--- report ---");
console.log(mainText.slice(0, 1600).replace(/\n+/g, " | "));

const chatText = await page.locator("section").first().innerText();
console.log("--- trace / messages ---");
console.log(chatText.slice(0, 1100).replace(/\n+/g, " | "));

if (gate) {
  await page.getByRole("button", { name: "代码", exact: true }).click();
  await page.waitForTimeout(400);
  const code = await page.locator("main pre code").innerText().catch(() => "");
  if (code) {
    fs.writeFileSync("scripts/real-code.html", code);
    console.log(
      "code saved:",
      `${code.length} chars`,
      "| </body>:",
      /<\/body>/i.test(code),
      "| </html>:",
      /<\/html>/i.test(code),
      "| external:",
      /(?:https?:\/\/|src\s*=\s*["']\/\/)/i.test(code),
    );
  }
  await page.getByRole("button", { name: /^预览/ }).first().click();
  await page.waitForTimeout(800);
  const frame = page.frameLocator('iframe[title="应用预览"]');
  try {
    console.log("app title:", await frame.getByTestId("app-title").innerText({ timeout: 4000 }));
  } catch {
    console.log("app title: (not found)");
  }
  await page.screenshot({ path: "scripts/real-generation.png" });
}

console.log("console errors:", JSON.stringify(errors.slice(0, 10)));
await browser.close();
