import { expect, test, type Page } from "@playwright/test";

import { waitForConfirmationLink } from "./helpers/mailpit";

async function registerAndConfirm(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  const confirmLink = await waitForConfirmationLink(email);
  await page.goto(confirmLink);
}

test("the public API lists the Nodes as JSON", async ({ request }) => {
  const res = await request.get("/api/v1/nodes");
  expect(res.status()).toBe(200);
  expect(res.headers()["access-control-allow-origin"]).toBe("*");
  const body = await res.json();
  expect(body.data.some((n: { slug: string }) => n.slug === "pdbff")).toBe(true);
  expect((await request.get("/api/v1/people/not-an-id")).status()).toBe(404);
});

test("a person page offers signed interpretations, apart from the facts", async ({ page }) => {
  await registerAndConfirm(page, `e2e-interp-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/people?q=arvoredo");
  await page.getByRole("link", { name: /Helena Arvoredo/ }).first().click();
  await expect(page.getByRole("heading", { level: 2, name: "Interpretations" })).toBeVisible();
  await expect(page.getByText(/Write a signed interpretation about/)).toBeVisible();
});

test("check ties and declare support", async ({ page }) => {
  await registerAndConfirm(page, `e2e-ties-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/integrity?q=arvoredo");
  await expect(page.getByRole("heading", { level: 1, name: "Check ties" })).toBeVisible();
  await page.getByRole("link", { name: /^Add Helena Arvoredo/ }).first().click();
  await expect(page.getByText("Chosen (1/15)")).toBeVisible();

  await page.goto("/workspace/support");
  await expect(page.getByRole("heading", { level: 1, name: "Declare your support and ties" })).toBeVisible();
  await expect(page.getByText(/OTHER SUPPORT/)).toBeVisible();
});
