import { chromium } from "playwright-core";

const url = process.env.APP_URL || "http://localhost:3000";
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await chromium.launch({ headless: true, executablePath: edge });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(url, { waitUntil: "networkidle" });

for (const name of ["习惯打卡", "极简记账"]) {
  await page.getByRole("button", { name: "新建", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(name) }).first().click();
  await page.getByText("质量门禁通过").waitFor({ timeout: 30000 });
  const text = await page.locator("main").innerText();
  console.log(
    name,
    "| gate: passed |",
    text.includes("6/6") || text.includes("7/7") || text.includes("8/8")
      ? "checks ok"
      : "unexpected checks",
  );
  console.log(
    "  score 100:",
    await page.locator("main").getByText("100", { exact: true }).count(),
  );
  await page.screenshot({ path: `scripts/tpl-${name}.png` });
}

await page.getByRole("button", { name: "版本", exact: true }).click();
console.log("versions:", (await page.locator("main").innerText()).replace(/\n+/g, " | ").slice(0, 260));

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth,
);
console.log("mobile horizontal overflow:", overflow);
await page.screenshot({ path: "scripts/tpl-mobile.png" });

console.log("errors:", JSON.stringify(errors));
await browser.close();
