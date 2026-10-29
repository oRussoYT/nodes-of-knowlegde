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

// Without AI the record's sources are the answer -- each linked to its page.
test("a member asks the record and gets its sources", async ({ page }) => {
  await registerAndConfirm(page, `e2e-ask-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/ask");
  await page.getByLabel("Your question").fill("Helena Arvoredo");
  await page.getByRole("main").getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page).toHaveURL(/\/ask\?q=Helena/);
  await expect(page.getByRole("heading", { level: 2, name: /Sources in the record/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Helena Arvoredo/ }).first()).toBeVisible();
});
