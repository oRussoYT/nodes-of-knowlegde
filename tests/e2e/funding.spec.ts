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

test("a member opens calls and grants", async ({ page }) => {
  await registerAndConfirm(page, `e2e-funding-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/funding");
  await expect(page.getByRole("heading", { level: 1, name: "Calls and grants" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "For you" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "All open calls" })).toBeVisible();
});
