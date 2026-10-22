import { expect, test, type Page } from "@playwright/test";

import { waitForConfirmationLink } from "./helpers/mailpit";

// A member fills in their own profile card and sees it in the member area
// and the sidebar. Photo upload goes through the browser to Storage and is
// covered by the database tests (supabase/tests/database/member_profiles.test.sql).

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

test("a member edits their profile and sees it in the member area", async ({ page }) => {
  const email = `e2e-profile-${Date.now()}@example.com`;
  await registerAndConfirm(page, email, "correcthorse1");

  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1, name: "Your profile" })).toBeVisible();

  await page.getByLabel("Name").fill("Ana Field");
  await page.getByLabel("Headline").fill("Doctoral student, forest ecology");
  await page.getByLabel("Where you are").fill("Manaus, Brazil");
  await page.getByLabel("ORCID iD").fill("https://orcid.org/0000-0002-1825-0097");
  await page.getByLabel("Website").fill("example.org");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page).toHaveURL(/\/profile\?saved=1$/);
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByRole("link", { name: "ORCID 0000-0002-1825-0097" })).toBeVisible();
  await expect(page.getByRole("link", { name: "example.org" })).toHaveAttribute("href", "https://example.org");

  await page.goto("/member");
  await expect(page.getByRole("heading", { level: 2, name: "Ana Field" })).toBeVisible();
  await expect(page.getByText("Doctoral student, forest ecology")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit your profile" })).toHaveAttribute("href", "/profile");
});

test("a bad ORCID is refused with a clear message", async ({ page }) => {
  const email = `e2e-profile-bad-${Date.now()}@example.com`;
  await registerAndConfirm(page, email, "correcthorse1");

  await page.goto("/profile");
  await page.getByLabel("ORCID iD").fill("12345");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("The ORCID iD should look like 0000-0002-1825-0097.")).toBeVisible();
});
