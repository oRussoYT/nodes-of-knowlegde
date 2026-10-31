import { expect, test } from "@playwright/test";

import { waitForConfirmationLink } from "./helpers/mailpit";

test.describe("Registration", () => {
  test("shows field errors for invalid input and does not submit", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByLabel("Confirm password").fill("different");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText(/at least 8 characters/)).toBeVisible();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();
    // Still on the registration form, not the neutral success state.
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("requires explicit terms acceptance", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("correcthorse1");
    await page.getByLabel("Confirm password").fill("correcthorse1");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/accept the Terms/)).toBeVisible();
  });

  test("registers, confirms via the Mailpit email, and reaches the member area", async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("correcthorse1");
    await page.getByLabel("Confirm password").fill("correcthorse1");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();

    // Explicit "confirmation email sent" state — neutral wording, same
    // regardless of whether the address was already registered.
    await expect(page.getByText(/Check your email/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Resend confirmation email" })).toBeVisible();

    const confirmLink = await waitForConfirmationLink(email);
    await page.goto(confirmLink);

    await expect(page).toHaveURL(/\/member\?confirmed=1$/);
    // Explicit "confirmation success" state.
    await expect(page.getByText("Your email address has been confirmed.")).toBeVisible();
    // The page body (src/app/(protected)/member/page.tsx) shows this email
    // as visible text in two places by design: the "You're signed in as
    // {email}" welcome line, and the "Your account" summary card's Email
    // row (same real fact, surfaced in both places per
    // docs/application-information-architecture.md's dashboard hierarchy).
    // An unscoped getByText(email) therefore has two legitimate matches.
    // Rather than loosen the assertion with .first() (which would keep
    // passing even if unrelated/unintended extra email copies appeared
    // elsewhere on the page later), scope to the specific <p> that renders
    // the welcome sentence — identified by its own fixed, unrelated text
    // "You're signed in as", not by DOM position — and assert the email
    // appears inside *that* element specifically.
    const welcomeSentence = page.locator("main p", { hasText: "You're signed in as" });
    await expect(welcomeSentence.getByText(email)).toBeVisible();
    await expect(page.getByText(/connected to a Nodes of Knowledge person record/)).toBeVisible();
  });

  test("resend confirmation sends another email and enforces a cooldown", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("correcthorse1");
    await page.getByLabel("Confirm password").fill("correcthorse1");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/Check your email/)).toBeVisible();

    // First email from registration itself.
    await waitForConfirmationLink(email);

    const resendButton = page.getByRole("button", { name: "Resend confirmation email" });
    await resendButton.click();

    await expect(
      page.getByText(/we've sent another link|If that address is registered/),
    ).toBeVisible();
    // Cooldown disables the button and relabels it.
    await expect(page.getByRole("button", { name: /Resend available in \d+s/ })).toBeVisible();
  });
});
