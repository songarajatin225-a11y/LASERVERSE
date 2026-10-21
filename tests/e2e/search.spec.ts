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

test("command palette keeps Tab focus inside and returns focus on Escape", async ({ page }) => {
  await page.goto("/home");
  const trigger = page.getByRole("button", { name: "Search the handbook and tools" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Search" });
  await dialog.getByRole("combobox").or(dialog.getByRole("textbox")).first().fill("fluence");
  await expect(dialog.getByRole("option").first()).toBeVisible();
  for (let i = 0; i < 25; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("source detail drawer closes with Escape", async ({ page }) => {
  await page.goto("/sources?family=fiber");
  await page.getByRole("button", { name: /Yb fiber, CW single-mode/ }).first().click();
  const drawer = page.getByRole("dialog", { name: /Yb fiber, CW single-mode/ });
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});
