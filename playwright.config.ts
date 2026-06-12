import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration.
 *
 * WHY THIS EXISTS:
 * The e2e specs in tests/e2e use page.goto("/") and therefore need a baseURL,
 * and they need the Next.js app to actually be running. This config wires up
 * both: it boots the app via the `webServer` block and points the tests at it.
 *
 * It also scopes `testDir` to tests/e2e so Playwright never tries to execute the
 * Jest unit tests elsewhere in the repo (the mirror image of jest.config.js
 * ignoring tests/e2e).
 */
const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
