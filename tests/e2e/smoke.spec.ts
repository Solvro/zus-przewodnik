import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/", "/ciaza", "/plan", "/admin", "/kalkulator", "/przewodnik", "/wsparcie", "/wsparcie/trudna-sytuacja", "/wnioski", "/asystent", "/kalkulator/sprawa", "/logowanie", "/o-projekcie", "/dostepnosc"];

for (const path of PAGES) {
  test(`a11y ${path}: brak poważnych naruszeń WCAG 2.1 AA`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    // Bez poziomego przewijania na żadnej szerokości
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("logowanie (mObywatel — symulacja) → plan z danymi z ZUS", async ({ page }) => {
  await page.goto("/logowanie", { waitUntil: "networkidle" });
  await page.getByLabel(/Anna Kowalska/).check();
  await page.getByRole("button", { name: "Dalej" }).click();
  await page.getByRole("button", { name: /Potwierdzam/ }).click();
  await page.waitForURL("**/plan");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Anna");
  await expect(page.getByText("Masz prawo do zasiłku macierzyńskiego")).toBeVisible();
});

test("tryb sprawy: przykład P-01 zgodny z decyzją", async ({ page }) => {
  await page.goto("/kalkulator/sprawa", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /P-01/ }).click();
  await expect(page.getByText("zgodne (±1 zł)")).toBeVisible();
});

test("kalkulator przelicza po zmianie wynagrodzenia", async ({ page }) => {
  await page.goto("/kalkulator", { waitUntil: "networkidle" });
  const field = page.locator("#mother-gross");
  await field.fill("10000");
  await expect(page.getByText("8629,00").first()).toBeVisible({ timeout: 10_000 });
});

test("panel admina: wyłączony moduł znika z nawigacji i blokuje stronę oraz API", async ({ page, request }) => {
  const headers = { "x-admin-token": "demo-admin" };
  test.skip(test.info().project.name !== "desktop", "zmiana stanu serwera — raz");
  try {
    expect((await request.post("/api/v1/admin/features", { headers, data: { assistant: false } })).ok()).toBe(true);
    await page.goto("/asystent", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /chwilowo wyłączony/ })).toBeVisible();
    expect((await request.post("/api/v1/assistant", { data: { messages: [{ role: "user", content: "test" }] } })).status()).toBe(403);
    expect((await request.post("/api/v1/admin/features", { data: { assistant: true } })).status()).toBe(401);
  } finally {
    await request.post("/api/v1/admin/features", { headers, data: { assistant: true } });
  }
});

test("kalkulator: sytuacja szczególna mamy — tata przejmuje urlop po 8 tygodniach", async ({ page }) => {
  await page.goto("/kalkulator", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Uwzględnij drugiego rodzica/ }).click();
  await page.getByRole("switch", { name: /Sytuacja szczególna mamy/ }).click();
  await page.getByLabel("Co się stało?").selectOption("incapacity");
  await page.getByRole("tab", { name: "Oś czasu" }).click();
  await expect(page.getByRole("button", { name: /niezdolność matki do samodzielnej egzystencji/ })).toBeVisible();
});
