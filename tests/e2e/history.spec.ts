import { expect, test, type Page } from "@playwright/test";

import { waitForConfirmationLink } from "./helpers/mailpit";

// "Everything has a history": a member adds an expedition; it waits for a
// steward and is marked so. Review rules: supabase/tests/database/heritage_items.test.sql.

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

test("a member adds an expedition to the history", async ({ page }) => {
  await registerAndConfirm(page, `e2e-history-${Date.now()}@example.com`, "correcthorse1");

  await page.goto("/history");
  await expect(page.getByRole("heading", { level: 1, name: "History" })).toBeVisible();
  await page.getByRole("link", { name: "Add to the history" }).click();

  await page.getByLabel("What is it").selectOption("expedition");
  await page.getByLabel("Title").fill("Rio Negro survey, 1991");
  await page.getByLabel("From (year)").fill("1991");
  await page.getByLabel("Place (optional)").fill("Rio Negro");
  await page.getByLabel("What documents it").fill("Field book 1991, INPA archive");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Rio Negro survey, 1991" })).toBeVisible();
  await expect(page.getByText("Waiting for review")).toBeVisible();
  await expect(page.getByText("Field book 1991, INPA archive")).toBeVisible();

  await page.goto("/history?kind=expedition");
  await expect(page.getByRole("link", { name: "Rio Negro survey, 1991" })).toBeVisible();
});
