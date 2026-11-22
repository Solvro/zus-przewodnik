import { defineConfig, devices } from "@playwright/test";

/** E2E + audyt dostępności (axe). Uruchom: pnpm e2e (serwer startuje automatycznie). */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3123", channel: process.env.CI ? undefined : "chrome" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm dev --port 3123", url: "http://localhost:3123/api/v1/health", reuseExistingServer: true, timeout: 120_000 },
});
