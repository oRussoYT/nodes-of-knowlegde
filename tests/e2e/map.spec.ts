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

// The map page opens for members with its three views.
test("a member opens the map and switches views", async ({ page }) => {
  await registerAndConfirm(page, `e2e-map-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/map");
  await expect(page.getByRole("heading", { level: 1, name: "Map" })).toBeVisible();
  await page.getByRole("link", { name: "Movements" }).click();
  await expect(page).toHaveURL(/view=movements/);
  await page.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL(/view=today/);
});
