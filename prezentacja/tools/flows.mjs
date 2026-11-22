// Zrzuty ekranów „z danymi” (zalogowana persona, plan, sprawa, admin, asystent).
// Użycie: node prezentacja/tools/flows.mjs [baseURL] [desktop|mobile]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3123";
const TAG = process.argv[3] ?? "desktop";
const OUT = path.resolve("prezentacja/assets/screens");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext(
  TAG === "mobile"
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "reduce" }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce" },
);
const page = await ctx.newPage();
const shot = async (name, full = false) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}-${TAG}.png`, fullPage: full });
  console.log("shot", name);
};
const step = async (label, fn) => {
  try {
    await fn();
  } catch (e) {
    console.log(`FAIL ${label}: ${e.message.split("\n")[0]}`);
  }
};
const go = (url) => page.goto(BASE + url, { waitUntil: "networkidle" });

// 1. Logowanie przez mObywatela (symulacja) → persona
await step("login", async () => {
  await go("/logowanie");
  await page.getByText("Anna Kowalska").first().click();
  await shot("x-logowanie-wybor");
  const btn = page.getByRole("button", { name: /zaloguj|potwierdź|dalej/i }).first();
  await btn.click();
  await page.waitForLoadState("networkidle");
  await shot("x-mobywatel-kod");
  await page.getByRole("button", { name: /potwierdzam/i }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  await shot("x-po-logowaniu");
});

// 2. Konto eZUS z danymi
await step("konto", async () => {
  await go("/konto");
  await shot("x-konto");
  await shot("x-konto-full", true);
});

// 3. Plan
await step("plan", async () => {
  await go("/plan");
  await shot("x-plan");
  await shot("x-plan-full", true);
});

// 4. Kalkulator — zakładki wyniku
await step("kalkulator", async () => {
  await go("/kalkulator");
  await shot("x-kalkulator");
  for (const tab of ["Oś czasu", "Co złożyć", "Ryzyka", "Skąd te liczby"]) {
    await step("tab " + tab, async () => {
      await page.getByRole("tab", { name: tab }).first().click();
      await shot("x-kalk-" + tab.toLowerCase().replace(/\s+/g, "-").replace(/ą/g, "a").replace(/ó/g, "o").replace(/ż/g, "z").replace(/ł/g, "l").replace(/ę/g, "e").replace(/ć/g, "c"));
    });
  }
});

// 5. Sprawa ZUS — przykładowa sprawa → wynik + porównanie z decyzją
await step("sprawa", async () => {
  await go("/kalkulator/sprawa");
  await page.getByText(/^P-01/).first().click();
  await page.waitForTimeout(4000);
  await page.waitForLoadState("networkidle");
  await shot("x-sprawa-wynik");
  await shot("x-sprawa-wynik-full", true);
});

// 6. Wnioski — wypełniony wniosek
await step("wnioski", async () => {
  await go("/wnioski");
  await page.getByText("Urlop rodzicielski").first().click();
  await page.waitForLoadState("networkidle");
  await shot("x-wniosek");
  await shot("x-wniosek-full", true);
});

// 7. Admin — token demo
await step("admin", async () => {
  await go("/admin");
  await page.getByLabel(/token/i).fill("demo-admin");
  await page.getByRole("button", { name: /zaloguj/i }).last().click();
  await page.waitForTimeout(2000);
  await shot("x-admin");
  await shot("x-admin-full", true);
});

// 8. Asystent — przykładowe pytanie
await step("asystent", async () => {
  await go("/asystent");
  await page.getByRole("button", { name: /81,5%/ }).first().click();
  await page.waitForTimeout(25000);
  await shot("x-asystent");
});

await browser.close();
