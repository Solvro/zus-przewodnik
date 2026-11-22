// Nagrywa film demo Rodzicownika (Playwright + CDP screencast) zsynchronizowany z lektorem.
// Wymaga prezentacja/film/audio/timings.json (z tts.py). Użycie: node prezentacja/film/record.mjs <katalog_klatek> [baseURL]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "prezentacja/film/_frames");
const BASE = process.argv[3] ?? "http://localhost:3123";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const DOC = path.join(HERE, "z3-przyklad.pdf");
const TIM = JSON.parse(fs.readFileSync(path.join(HERE, "audio", "timings.json"), "utf8"));
const SC = Object.fromEntries(TIM.scenes.map((s) => [s.id, s]));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", args: ["--hide-scrollbars", "--font-render-hinting=none"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3, locale: "pl-PL" });
await ctx.addInitScript({ path: path.join(HERE, "overlay.js") });
const page = await ctx.newPage();

// --- screencast ---------------------------------------------------------------
const cdp = await ctx.newCDPSession(page);
const frames = [], marks = [];
let n = 0;
cdp.on("Page.screencastFrame", async (f) => {
  const file = `f${String(n++).padStart(6, "0")}.jpg`;
  fs.writeFileSync(path.join(OUT, file), Buffer.from(f.data, "base64"));
  frames.push({ file, t: f.metadata.timestamp });
  try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {}
});
const now = () => Date.now() / 1000;
const mark = (type, label = "") => marks.push({ type, label, t: now() });

// --- helpers --------------------------------------------------------------------
const sleep = (ms) => page.waitForTimeout(Math.max(0, ms));
const demo = async (fn, ...a) => {
  for (let i = 0; i < 25; i++) {
    try { return await page.evaluate(([f, args]) => window.__demo?.[f]?.(...args), [fn, a]); }
    catch { await new Promise((r) => setTimeout(r, 120)); }   // trwa nawigacja — ponów
  }
};
let cur = { x: 720, y: 460 };
async function glideTo(x, y, ms = 520) {
  const steps = Math.max(10, Math.round(ms / 16)), sx = cur.x, sy = cur.y;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps, e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
    await sleep(16);
  }
  cur = { x, y };
}
async function point(loc, { ms = 520, dx = 0.5, dy = 0.5 } = {}) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const b = await loc.boundingBox();
  if (!b) throw new Error("brak elementu do wskazania");
  await glideTo(b.x + b.width * dx, b.y + b.height * dy, ms);
}
async function click(loc, opts = {}) {
  await point(loc, opts);
  await sleep(110);
  await page.mouse.down(); await sleep(60); await page.mouse.up();
  await sleep(opts.after ?? 350);
}
async function scrollTo(y, ms = 900) {
  await page.evaluate(([y, ms]) => new Promise((res) => {
    const s = scrollY, d = y - s, t0 = performance.now();
    const f = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, s + d * e); k < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }), [y, ms]);
}
const scrollToEl = async (loc, offset = 120, ms = 900) =>
  scrollTo(Math.max(0, await loc.evaluate((el, off) => el.getBoundingClientRect().top + scrollY - off, offset)), ms);
async function settle() {
  await page.waitForFunction(() => !document.querySelector("[class*=animate-pulse],[aria-busy=true]"), null, { timeout: 4000 }).catch(() => {});
}
async function covered(fn) { // akcja ukryta pod przejściem (bez cięcia w filmie)
  await demo("fadeOut"); await sleep(500);   // pełne wygaszenie (przejście 450 ms) przed akcją
  await fn();
  await page.waitForLoadState("networkidle"); await settle(); await sleep(150);
  await demo("fadeIn"); await sleep(380);
}
const go = (url, ready) => covered(async () => {
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  if (ready) await ready();
});
const zoomTo = async (loc, scale, closest = null) =>
  demo("zoom", await loc.evaluateHandle((el, sel) => (sel && el.closest(sel)) || el.parentElement, closest), scale);

// --- sceny zsynchronizowane z lektorem --------------------------------------------
let S0 = 0, CUR = null;
const timers = [];
async function scene(id, fn) {
  const sc = SC[id]; CUR = sc; S0 = now();
  mark("scene", id);
  for (const c of sc.chunks) timers.push(setTimeout(() => { demo("caption", c.sub || ""); }, c.t * 1000));
  const t0 = now();
  try { await fn(); console.log(`ok   ${id}  akcje ${(now() - t0).toFixed(1)} s / lektor ${sc.dur.toFixed(1)} s`); }
  catch (e) { console.log(`FAIL ${id}: ${e.message.split("\n")[0]}`); }
  const rest = sc.dur - (now() - S0);
  if (rest > 0) await sleep(rest * 1000);
}
const at = async (k, extra = 0) => { const t = CUR.chunks[k].t + extra - (now() - S0); if (t > 0) await sleep(t * 1000); };

// =================================================================================
// rozgrzewka: serwer dev kompiluje trasy przy pierwszym wejściu — robimy to przed nagraniem
for (const u of ["/kalkulator", "/kalkulator/sprawa", "/wnioski", "/konto", "/wsparcie/trudna-sytuacja", "/admin", "/plan", "/logowanie", "/"])
  await page.goto(BASE + u, { waitUntil: "networkidle" }).catch(() => {});
await page.evaluate(() => sessionStorage.clear());
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await sleep(700);
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
await sleep(200);
mark("start");

await scene("s1", async () => {
  await at(2);
  await zoomTo(page.getByText("Plan Ani i Tomka").first(), 1.55, "div[class*=card],div[class*=rounded]");
  await sleep(2600);
  await demo("unzoom");
});

await scene("s2", async () => {
  await covered(async () => {
    await click(page.getByRole("link", { name: "Zaloguj", exact: true }), { after: 0 });
    await page.getByText("Anna Kowalska").first().waitFor(); await settle();
  });
  await click(page.getByText("Anna Kowalska").first(), { after: 120 });
  await click(page.getByRole("button", { name: /zaloguj|dalej/i }).first(), { after: 450 });
  await click(page.getByRole("button", { name: /potwierdzam/i }), { after: 700 });
  await covered(async () => {
    await page.waitForURL(/plan/, { timeout: 15000 }).catch(() => {});
    await page.getByText("Masz prawo do zasiłku macierzyńskiego").first().waitFor({ timeout: 15000 });
  });
});

await scene("s3", async () => {
  await zoomTo(page.getByText("Masz prawo do zasiłku macierzyńskiego").first(), 1.7, "div");
  await at(1, -0.4);
  await demo("unzoom"); await sleep(500);
  const tl = page.getByText("Kto i kiedy jest na zasiłku").first();
  await scrollToEl(tl, 330, 700);
  await zoomTo(tl, 1.35, "section,div[class*=card],div[class*=rounded]");
  await at(2, -0.2);
  await demo("unzoom"); await sleep(450);
  await scrollTo(0, 600);
  await zoomTo(page.getByText(/Ostatni dzień na wniosek o 81,5%/).first(), 1.8, "li,article,div");
});

await scene("s4", async () => {
  await demo("unzoom");
  await go("/kalkulator");
  const totalBox = async () => page.getByText("Razem brutto").first().evaluateHandle((el) => el.closest("div").parentElement);
  const sel = page.locator("select").first();
  await point(sel);
  await at(1);
  await sel.selectOption("2");
  await sleep(250);
  await demo("zoom", await totalBox(), 1.5);
  await at(2, -0.3);
  await demo("unzoom"); await sleep(400);
  await sel.selectOption("1");
  const zz = page.locator("div,label").filter({ hasText: /^Dziecko ma zaświadczenie/ }).getByRole("switch").first();
  await click(zz, { after: 400 });
  await demo("zoom", await totalBox(), 1.5);
  await at(4, -1.2);
  await demo("unzoom"); await sleep(450);
  await click(zz, { after: 200 });
  await at(4, -0.6);
  await click(page.getByRole("tab", { name: "Skąd te liczby" }), { after: 250 });
  await zoomTo(page.getByText(/Wynagrodzenie brutto pomniejszone/).first(), 1.6, "li,div");
  await at(5, -0.5);
  await demo("unzoom"); await sleep(350);
  await click(page.getByRole("tab", { name: "Ryzyka" }), { after: 250 });
  const rk = page.getByText(/DOBRZE WIEDZIEĆ|Dobrze wiedzieć/).first();
  if (await rk.count()) await zoomTo(rk, 1.5, "div");
});

await scene("s5a", async () => {
  await demo("unzoom");
  await go("/kalkulator/sprawa");
  const [fc] = await Promise.all([page.waitForEvent("filechooser"),
    click(page.getByRole("button", { name: "Wybierz pliki", exact: true }).first(), { after: 0 })]);
  await fc.setFiles(DOC);
  await sleep(450);
  await click(page.locator("input[type=checkbox]").first(), { after: 250 });
  await at(1, 0.2);
  await click(page.getByRole("button", { name: "Odczytaj i policz" }), { after: 0 });
});
// czekanie na odczyt AI — wycinane w montażu (lektor w tym czasie milczy)
mark("cut-start", "AI");
await page.getByText(/Odczytane dane/).first().waitFor({ timeout: 90000 });
await page.waitForLoadState("networkidle"); await settle(); await sleep(400);
mark("cut-end", "AI");

await scene("s5b", async () => {
  await at(1, -0.6);
  await scrollTo(0, 500);
  await click(page.getByRole("button", { name: /^P-01/ }), { after: 0 });
  const cmp = page.getByText(/Porównanie z decyzją/).first();
  await cmp.waitFor({ timeout: 20000 });
  await page.waitForLoadState("networkidle"); await settle(); await sleep(300);
  await zoomTo(cmp, 1.45, "section,div[class*=card],div[class*=rounded]");
});

await scene("s6", async () => {
  await demo("unzoom");
  await go("/wnioski");
  await click(page.getByText("Urlop rodzicielski").first(), { after: 0 });
  await page.waitForLoadState("networkidle"); await settle(); await sleep(400);
  await click(page.getByLabel(/Pracodawca/).first(), { after: 60 });
  await page.keyboard.type("Nordtech Solutions Sp. z o.o., Wrocław", { delay: 9 });
  await click(page.getByLabel(/Imię i nazwisko dziecka/).first(), { after: 60 });
  await page.keyboard.type("Zofia Kowalska", { delay: 18 });
  const send = page.getByRole("button", { name: /wyślij/i }).first();
  await scrollToEl(send, 430, 600);
  await click(send, { after: 700 });
  const ok = page.getByText(/UPO|wysłan|przekazan/i).first();
  if (await ok.count()) { await ok.scrollIntoViewIfNeeded(); await zoomTo(ok, 1.5, "div,section"); }
});

await scene("s7", async () => {
  await demo("unzoom");
  await go("/konto");
  await click(page.getByRole("tab", { name: /Zaświadczenie o składkach/ }).first(), { after: 250 });
  await click(page.getByRole("button", { name: /Wystaw zaświadczenie/ }).first(), { after: 800 });
  const res = page.getByText(/o stanie rozliczeń/i).first();
  if (await res.count()) await demo("zoom", await res.evaluateHandle((el) => el.closest("div").parentElement), 1.45);
});

await scene("s8", async () => {
  await demo("unzoom");
  await go("/wsparcie/trudna-sytuacja");
  await sleep(700);
  await scrollTo(380, 1600);
});

await scene("s9", async () => {
  await go("/admin");
  const pwd = page.locator("input[type=password]");
  await demo("zoom", await pwd.evaluateHandle((el) => el.closest("form") || el.parentElement.parentElement), 1.7);
  await sleep(500);
  await click(pwd, { after: 100 });
  await page.keyboard.type("demo-admin", { delay: 25 });
  await point(page.getByRole("button", { name: "Zaloguj" }).last());
  await covered(async () => {
    await page.mouse.down(); await sleep(50); await page.mouse.up();
    await page.getByText(/Nowa wersja parametrów/).first().waitFor({ timeout: 10000 }).catch(() => {});
    await sleep(300); await settle();
    await page.evaluate(() => { document.body.classList.remove("__demo-zoom"); document.body.style.transform = "none"; });
  });
  await page.evaluate(() => document.body.classList.add("__demo-zoom"));
  await at(2, -0.3);
  const reg = page.getByRole("tab", { name: /Regresja/ }).first();
  if (await reg.count()) {
    await point(reg);
    await covered(async () => {
      await page.mouse.down(); await sleep(50); await page.mouse.up();
      await page.getByText(/7\/7/).first().waitFor({ timeout: 15000 }).catch(() => {});
    });
    const okb = page.getByText(/7\/7/).first();
    if (await okb.count()) await demo("zoom", await okb.evaluateHandle((el) => el.closest("div").parentElement), 1.5);
  }
});

await scene("s10", async () => {
  await demo("caption", "");
  await demo("fadeOut"); await sleep(420);
  await page.setContent(fs.readFileSync(path.join(HERE, "outro.html"), "utf8"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
});
await sleep(700);

mark("end");
timers.forEach(clearTimeout);
await cdp.send("Page.stopScreencast").catch(() => {});
await sleep(300);
fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify({ frames, marks }, null, 1));
console.log(`frames: ${frames.length}, nagranie ≈ ${(marks.at(-1).t - marks.find((m) => m.type === "start").t).toFixed(1)} s`);
await browser.close();
