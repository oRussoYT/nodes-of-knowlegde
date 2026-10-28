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

// Connections come from one's own record: a new account is asked to link it first.
test("connections ask a new member to link their record first", async ({ page }) => {
  await registerAndConfirm(page, `e2e-connections-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/member/connections");
  await expect(page.getByRole("heading", { level: 1, name: "Connections" })).toBeVisible();
  await expect(page.getByText("Connect your account to your record first")).toBeVisible();
});
