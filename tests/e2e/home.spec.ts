import { test, expect } from "@playwright/test";

/**
 * Home page smoke test.
 *
 * WHY THIS TEST EXISTS:
 * Verifies the app starts up and renders a page without a crash.
 * This is the minimum bar — if this fails, nothing else matters.
 * Replace the `toContainText` assertion with your actual page content
 * once you've set up the home page.
 *
 * HOW TO EXTEND:
 * Add more test files in `tests/e2e/` per feature or user flow.
 * Example: `tests/e2e/onboarding.spec.ts` for the onboarding flow.
 */
test.describe("home page", () => {
  test("loads without crashing", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator("body")).toBeVisible();
  });

  test("is mobile-friendly", async ({ page }) => {
    await page.goto("/");
    // Verify no horizontal scroll on mobile viewport
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
