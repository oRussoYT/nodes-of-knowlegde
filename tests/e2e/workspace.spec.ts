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

test("a member keeps a private hypothesis", async ({ page }) => {
  await registerAndConfirm(page, `e2e-workspace-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/workspace");
  await page.getByLabel("Kind").selectOption("hypothesis");
  await page.getByLabel("Title").fill("Understory birds left first");
  await page.getByLabel("Text").fill("Maybe before 1985.");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Understory birds left first" })).toBeVisible();
  await expect(page.getByText("private — only you see this")).toBeVisible();
  await page.goto("/workspace");
  await expect(page.getByRole("link", { name: "Understory birds left first" })).toBeVisible();
});
