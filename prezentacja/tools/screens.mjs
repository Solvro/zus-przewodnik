// Zrzuty ekranu aplikacji do prezentacji (desktop 1440×900 @2x + mobile 390×844 @3x).
// Użycie: node prezentacja/tools/screens.mjs [baseURL] [filtr]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3123";
const FILTER = process.argv[3];
const OUT = path.resolve("prezentacja/assets/screens");
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  ["home", "/"],
  ["przewodnik", "/przewodnik"],
  ["plan", "/plan"],
  ["kalkulator", "/kalkulator"],
  ["sprawa", "/kalkulator/sprawa"],
  ["wnioski", "/wnioski"],
  ["konto", "/konto"],
  ["logowanie", "/logowanie"],
  ["asystent", "/asystent"],
  ["wsparcie", "/wsparcie"],
  ["trudna-sytuacja", "/wsparcie/trudna-sytuacja"],
  ["ciaza", "/ciaza"],
  ["admin", "/admin"],
  ["api-docs", "/api/docs"],
];

const browser = await chromium.launch({ channel: "chrome" });
const variants = [
  { tag: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  { tag: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];
for (const v of variants) {
  const ctx = await browser.newContext({ viewport: v.viewport, deviceScaleFactor: v.deviceScaleFactor, isMobile: v.isMobile, hasTouch: v.hasTouch, reducedMotion: "reduce" });
  for (const [name, url] of PAGES) {
    if (FILTER && !name.includes(FILTER)) continue;
    const page = await ctx.newPage();
    try {
      const res = await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}/${name}-${v.tag}.png` });
      await page.screenshot({ path: `${OUT}/${name}-${v.tag}-full.png`, fullPage: true });
      console.log(`${v.tag} ${name} ${res?.status()}`);
    } catch (e) {
      console.log(`${v.tag} ${name} FAIL ${e.message.split("\n")[0]}`);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
