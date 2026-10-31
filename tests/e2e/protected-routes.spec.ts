import { expect, test } from "@playwright/test";

test.describe("Protected routes", () => {
  test("an unauthenticated visitor is redirected from /member to /login with a returnTo", async ({
    page,
  }) => {
    await page.goto("/member");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fmember/);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    // Explicit "expired session" state — only shown when arriving via a
    // returnTo, not when a visitor just clicks "Log in".
    await expect(page.getByText(/session may have expired/)).toBeVisible();
  });

  test("visiting /login directly (no returnTo) does not show the expired-session state", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByText(/session may have expired/)).not.toBeVisible();
    await expect(page.getByText("Sign in to your Nodes of Knowledge account.")).toBeVisible();
  });

  test("an unauthenticated visitor is redirected from /account", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });

  test("an unauthenticated visitor is redirected from /update-password", async ({ page }) => {
    await page.goto("/update-password");
    await expect(page).toHaveURL(/\/login/);
  });

  test("an unauthenticated visitor is redirected from /member/claim", async ({ page }) => {
    await page.goto("/member/claim");
    await expect(page).toHaveURL(/\/login/);
  });

  test("an unauthenticated visitor is redirected from /review/claims", async ({ page }) => {
    await page.goto("/review/claims");
    await expect(page).toHaveURL(/\/login/);
  });
});
