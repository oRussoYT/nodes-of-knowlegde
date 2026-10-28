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

test("the forum is for members of the Node; joining opens it", async ({ page }) => {
  await registerAndConfirm(page, `e2e-forum-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/forum/pdbff");
  await expect(page.getByText(/Join .* to read and write here/)).toBeVisible();
  await page.goto("/n/pdbff");
  await page.getByRole("button", { name: /^Join / }).click();
  await page.goto("/forum/pdbff");
  await page.getByLabel("Start a conversation").fill("Memories of Camp 41");
  await page.getByLabel("Message").fill("Who remembers the 1987 season?");
  await page.getByRole("button", { name: "Post" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Memories of Camp 41" })).toBeVisible();
});

test("the profile explains consent over revelations", async ({ page }) => {
  await registerAndConfirm(page, `e2e-privacy-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 2, name: "What the record reveals about you" })).toBeVisible();
});
