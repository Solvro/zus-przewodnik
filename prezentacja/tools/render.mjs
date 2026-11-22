// Renderuje slajdy HTML (1920×1080) do PNG, a opcjonalnie składa PDF.
// Użycie:
//   node prezentacja/tools/render.mjs png <plik.html> [<plik2.html> ...]   → obok każdego pliku powstaje <plik>.png
//   node prezentacja/tools/render.mjs pdf <plik1.html> ...   → <plik>.pdf obok (scal: merge_pdf.py)
import { chromium } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [mode, ...rest] = process.argv.slice(2);
if (!mode || !rest.length) {
  console.error("usage: render.mjs png|pdf <html...>");
  process.exit(1);
}

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

async function open(file) {
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

if (mode === "png") {
  for (const file of rest) {
    const page = await open(file);
    const out = file.replace(/\.html$/, ".png");
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    const overflow = await page.evaluate(() => {
      const s = document.querySelector(".slide") ?? document.body;
      return { w: s.scrollWidth, h: s.scrollHeight };
    });
    console.log(`${out}  (content ${overflow.w}×${overflow.h}${overflow.w > 1920 || overflow.h > 1080 ? " — OVERFLOW!" : ""})`);
    await page.close();
  }
} else if (mode === "pdf") {
  // każdy slajd → <plik>.pdf (wektorowo); scalanie: merge_pdf.py
  for (const file of rest) {
    const page = await open(file);
    await page.pdf({ path: file.replace(/\.html$/, ".pdf"), width: "1920px", height: "1080px", printBackground: true, pageRanges: "1" });
    await page.close();
  }
  console.log(`PDF pages: ${rest.length}`);
}
await browser.close();
