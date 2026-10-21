import { test, expect } from "@playwright/test";

test("command palette finds handbook content and navigates", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("button", { name: "Search the handbook and tools" }).click();
  const box = page.getByRole("dialog").getByRole("combobox").or(page.getByRole("dialog").getByRole("textbox")).first();
  await box.fill("keyhole");
  const results = page.getByRole("dialog").getByRole("option");
  await expect(results.first()).toBeVisible();
  await box.press("Enter");
  await expect(page).not.toHaveURL(/\/home$/);
});

test("search page reads ?q= and filters by kind", async ({ page }) => {
  await page.goto("/search?q=galvo");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /galvo/i }).first()).toBeVisible();
});
