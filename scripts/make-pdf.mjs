import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const htmlPath = path.resolve("docs/VibeCheck-Project-Intro.html");
const pdfPath = path.resolve(process.env.PDF_PATH || "docs/VibeCheck-Project-Intro.pdf");
const html = fs.readFileSync(htmlPath, "utf8");

const browser = await chromium.launch({ headless: true, executablePath: edge });
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
await page.setContent(html, { waitUntil: "networkidle" });

const size = await page.evaluate(() => {
  const el = document.querySelector(".page");
  return {
    pageHeightPx: el ? Math.ceil(el.getBoundingClientRect().height) : null,
    scrollHeight: document.documentElement.scrollHeight,
    printableHeightPx: Math.round(((297 - 20) / 25.4) * 96),
  };
});
console.log("layout:", JSON.stringify(size));

await page.locator(".page").screenshot({ path: "scripts/pdf-preview.png" });

await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "10mm", bottom: "10mm", left: "12mm", right: "12mm" },
});

await browser.close();
console.log("PDF written:", pdfPath, fs.statSync(pdfPath).size, "bytes");
