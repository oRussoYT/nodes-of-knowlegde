import { expect, test, type Page } from "@playwright/test";

import { waitForConfirmationLink } from "./helpers/mailpit";

// The first Knowledge Node (PDBFF): a public page with counts only, and one
// account that joins it.

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

test("anyone can read the PDBFF Node and is invited to join", async ({ page }) => {
  await page.goto("/nodes");
  await expect(page.getByRole("heading", { level: 1, name: "One record. Many Nodes." })).toBeVisible();
  await page.getByRole("link", { name: /PDBFF/ }).first().click();
  await expect(page).toHaveURL(/\/n\/pdbff$/);
  await expect(page.getByRole("heading", { level: 1, name: "PDBFF" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an account to join PDBFF" })).toBeVisible();
  await expect(page.getByText("Pro bono — conservation research")).toBeVisible();
});

test("a member joins PDBFF from the Node page", async ({ page }) => {
  await registerAndConfirm(page, `e2e-node-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/n/pdbff");
  await page.getByRole("button", { name: "Join PDBFF" }).click();
  await expect(page).toHaveURL(/\/n\/pdbff\?joined=1$/);
  await expect(page.getByText("You are part of PDBFF")).toBeVisible();

  await page.goto("/member");
  await expect(page.getByRole("heading", { level: 2, name: "Your Nodes" })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "PDBFF", exact: true })).toHaveAttribute("href", "/n/pdbff");
});

test("an unknown Node is a 404", async ({ page }) => {
  const response = await page.goto("/n/does-not-exist");
  expect(response?.status()).toBe(404);
});
