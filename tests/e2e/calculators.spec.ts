import { test, expect } from "@playwright/test";

test("photon-energy calculator computes, validates and resets", async ({ page }) => {
  await page.goto("/calculators/photon-energy");
  const input = page.getByRole("textbox", { name: /Vacuum wavelength/ });
  await expect(input).toHaveValue("1064");
  await expect(page.getByText("1.165").first()).toBeVisible();

  await input.fill("355");
  await expect(page.getByText("3.493").first()).toBeVisible();

  await input.fill("abc");
  await expect(page.getByText(/Enter a number/)).toBeVisible();
  await expect(input).toHaveAttribute("aria-invalid", "true");

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(input).toHaveValue("1064");
});

test("unit change keeps the physical value", async ({ page }) => {
  await page.goto("/calculators/photon-energy");
  await page.getByRole("combobox", { name: /Vacuum wavelength unit/ }).selectOption({ label: "µm" });
  await expect(page.getByRole("textbox", { name: /Vacuum wavelength/ })).toHaveValue(/1\.064/);
  await expect(page.getByText("1.165").first()).toBeVisible();
});
