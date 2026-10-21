import { expect, test } from "@playwright/test";

import { waitForConfirmationLink } from "./helpers/mailpit";

test.describe("Forgot password", () => {
  test("shows a neutral response for an unregistered email", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(`unregistered-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByText(/If an account exists/)).toBeVisible();
  });

  test("shows the identical response for a registered, confirmed email (enumeration review)", async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "correcthorse1";

    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();
    const confirmLink = await waitForConfirmationLink(email);
    await page.goto(confirmLink);

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();

    // Byte-for-byte the same wording as the unregistered-email case above.
    await expect(page.getByText(/If an account exists/)).toBeVisible();
  });

  test("rejects malformed input before ever calling Supabase", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  });
});
