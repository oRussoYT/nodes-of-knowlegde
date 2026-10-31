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

test("a person's record opens as a printable CV", async ({ page }) => {
  await registerAndConfirm(page, `e2e-cv-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/people?q=arvoredo");
  await page.getByRole("link", { name: /Helena Arvoredo/ }).first().click();
  await page.getByRole("link", { name: /See this record as a CV/ }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]+\/cv$/);
  await expect(page.getByRole("heading", { level: 2, name: "Positions and studies" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
});

test("find an advisor by institution", async ({ page }) => {
  await registerAndConfirm(page, `e2e-advisors-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/advisors?q=arvoredo");
  await expect(page.getByRole("heading", { level: 1, name: "Find an advisor" })).toBeVisible();
  await expect(page.getByText(/advisees? documented/).first()).toBeVisible();
});
