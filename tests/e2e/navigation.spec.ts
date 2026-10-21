import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

const ROUTES = [
  "/home",
  "/learn",
  "/assessments",
  "/physics-lab",
  "/sources",
  "/beam-optics",
  "/materials",
  "/processes",
  "/machine",
  "/applications",
  "/calculators",
  "/architecture",
  "/safety",
  "/troubleshooting",
  "/reference",
  "/reference/glossary",
  "/reference/formulas",
  "/reference/figures",
  "/reference/map",
  "/reference/decision-tree",
  "/reference/status",
  "/reference/sources",
  "/search",
  "/learn/part-9/9-4",
  "/processes/welding",
  "/applications/case-2",
  "/calculators/focus-spot",
];

test("landing page presents the product and its entry points", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "PHOTON TO PRODUCT" })).toBeVisible();
  await expect(page.getByText("The interactive laser technology platform", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Explore laser physics, understand industrial laser systems, and investigate the engineering behind real-world laser applications.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Explore the Technology Map/ })).toHaveAttribute("href", "/reference/map");
  await expect(page.getByRole("img", { name: /Titan Engineering & Automation Limited/ }).first()).toBeVisible();
  await page.getByRole("link", { name: /Enter the Laboratory/ }).first().click();
  await expect(page).toHaveURL(/\/home$/);
  expect(errors).toEqual([]);
});

test("skip intro jumps past the story", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Skip intro" }).click();
  await expect(page.getByRole("heading", { name: /Fifteen working areas/ })).toBeInViewport();
});

for (const route of ROUTES) {
  test(`renders ${route} with a heading and no runtime errors`, async ({ page }) => {
    const errors = trackErrors(page);
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("breadcrumbs lead back to home", async ({ page }) => {
  await page.goto("/processes/welding");
  const crumbs = page.getByRole("navigation", { name: /breadcrumb/i });
  await crumbs.getByRole("link", { name: "Process Simulator" }).click();
  await expect(page).toHaveURL(/\/processes$/);
});

test("search index is served as static JSON", async ({ request }) => {
  const res = await request.get("/search-index.json");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(Array.isArray(body.docs)).toBe(true);
  expect(body.docs.length).toBeGreaterThan(300);
});
