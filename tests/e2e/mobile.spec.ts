import { test, expect } from "@playwright/test";
import { noHorizontalScroll, trackErrors } from "./helpers";

const PAGES = ["/", "/home", "/learn/part-1/1-6", "/physics-lab", "/materials", "/processes/marking", "/machine", "/applications", "/calculators/focus-spot", "/safety", "/troubleshooting", "/reference/map", "/reference/glossary", "/search?q=fiber"];

for (const p of PAGES) {
  test(`mobile layout has no horizontal overflow: ${p}`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(p);
    await page.waitForLoadState("load");
    await noHorizontalScroll(page);
    expect(errors).toEqual([]);
  });
}

test("mobile navigation drawer opens and navigates", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation" });
  await drawer.getByRole("link", { name: "3D Machine Explorer" }).click();
  await expect(page).toHaveURL(/\/machine$/);
});

test("reduced motion: landing still renders the story", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "PHOTON TO PRODUCT" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
  await expect(page.getByRole("heading", { name: /A cavity turns gain into a laser/ })).toBeVisible();
  await ctx.close();
});
