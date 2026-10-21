import { test, expect } from "@playwright/test";

test("lesson completion and bookmarks persist across reloads", async ({ page }) => {
  await page.goto("/learn/part-1/1-6");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Photon energy");
  await page.getByRole("button", { name: "Mark as complete" }).click();
  await expect(page.getByText(/^Completed/).first()).toBeVisible();
  await page.getByRole("button", { name: "Bookmark" }).first().click();
  await page.reload();
  await expect(page.getByText(/^Completed/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Bookmarked" }).first()).toBeVisible();

  await page.goto("/home");
  await expect(page.getByTestId("bookmark-list")).toContainText("Photon energy");
  await expect(page.getByRole("region", { name: /continue/i }).or(page.getByLabel("Continue"))).toContainText("Photon energy");
});

test("quiz gives feedback on a submitted answer", async ({ page }) => {
  await page.goto("/assessments/l1");
  const group = page.getByRole("radiogroup", { name: "Answer choices" }).first();
  await group.getByRole("radio").first().click();
  await page.getByRole("button", { name: "Check answer" }).first().click();
  await expect(page.getByLabel("Correct answer").first()).toBeVisible();
});
