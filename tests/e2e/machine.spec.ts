import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

test("3D machine explorer: selection, explode, layers, camera reset", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/machine");
  const viewport = page.getByTestId("machine-viewport");
  await expect(viewport.locator("canvas")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "2-axis galvo scanner" }).click();
  await expect(page.getByRole("region", { name: /2-axis galvo scanner details/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Focus camera" })).toBeVisible();

  await page.getByRole("switch", { name: "Exploded view" }).click();
  await expect(page.getByRole("switch", { name: "Exploded view" })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("switch", { name: /Safety/ }).click();
  await expect(page.getByRole("switch", { name: /Safety/ })).toHaveAttribute("aria-checked", "false");

  await page.getByRole("button", { name: "Reset camera" }).click();
  await page.getByRole("button", { name: "Scan head" }).click();

  // conceptual interlock logic
  await page.getByRole("button", { name: "Run marking job" }).click();
  await expect(page.getByText("Emission enable: ON")).toBeVisible();
  await page.getByRole("switch", { name: "Door closed" }).click();
  await expect(page.getByText("Emission enable: OFF")).toBeVisible();
  await expect(page.getByText(/Door open/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("2D schematic is keyboard operable", async ({ page }) => {
  await page.goto("/machine?view=2d");
  const block = page.getByRole("button", { name: "F-theta lens (f = 160 mm)" }).first();
  await block.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: /F-theta lens/ })).toBeVisible();
});

test("falls back to 2D when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error test shim: deny WebGL contexts
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      if (/webgl/i.test(type)) return null;
      return orig.call(this, type as "2d", ...(rest as []));
    };
  });
  await page.goto("/machine");
  await expect(page.getByText("WebGL not available")).toBeVisible();
  await expect(page.getByRole("group", { name: /2D schematic/ })).toBeVisible();
});

test("?select= deep link opens a component", async ({ page }) => {
  await page.goto("/machine?select=interlock");
  await expect(page.getByRole("region", { name: /Door interlock switch details/ })).toBeVisible();
});
