import { expect, type Page, test } from "@playwright/test";

import { waitForConfirmationLink } from "./helpers/mailpit";

async function registerAndConfirm(page: Page, email: string, password: string) {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  const confirmLink = await waitForConfirmationLink(email);
  await page.goto(confirmLink);
}

// /login renders two separate <form>s: the sign-in form itself, and — inside
// the collapsed "Didn't get a confirmation email?" <details> — a second,
// independent ResendConfirmationForm that also has its own "Email" field
// (src/app/login/page.tsx). A collapsed <details>'s content is hidden via
// the browser's default `display: none` styling, but Playwright's locators
// still match elements regardless of visibility (only actions like .fill()
// wait for visibility) — so an unscoped `page.getByLabel("Email")` resolves
// to *two* elements on this page and throws a strict-mode violation, which
// .fill()'s auto-retry surfaces as a timeout. Scoping to the form that
// contains the "Log in" button avoids the ambiguity without touching the
// application: having two same-labeled-but-different-purpose forms on one
// page is normal and not itself a bug.
function loginForm(page: Page) {
  return page.locator("form").filter({ has: page.getByRole("button", { name: "Log in" }) });
}

test.describe("Login", () => {
  test("shows field errors for empty input", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();
  });

  test("shows one generic error for wrong credentials, whether or not the account exists", async ({
    page,
  }) => {
    await page.goto("/login");
    await loginForm(page).getByLabel("Email").fill(`nobody-${Date.now()}@example.com`);
    await loginForm(page).getByLabel("Password").fill("wrongpassword1");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });

  test("an unconfirmed account gets the same generic error as wrong credentials (enumeration review)", async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "correcthorse1";

    // Register but never click the confirmation link.
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/Check your email/)).toBeVisible();

    await page.goto("/login");
    await loginForm(page).getByLabel("Email").fill(email);
    await loginForm(page).getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    // Same exact string as wrong-credentials above — not a distinct
    // "please confirm your email" message, which would reveal that this
    // address is registered. See src/lib/auth/errors.ts.
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });

  test("the login page always offers a resend-confirmation option", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Didn't get a confirmation email?").click();
    await expect(page.getByRole("button", { name: "Resend confirmation email" })).toBeVisible();
  });

  test("logging out ends the session — protected routes redirect to /login again", async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "correcthorse1";

    await registerAndConfirm(page, email, password);
    // Confirming a fresh signup lands on /member?confirmed=1 (the query
    // param drives the confirmation-success banner — see
    // src/app/(protected)/member/page.tsx). This test isn't exercising that
    // banner, just that confirming lands in the member area at all, so it
    // only asserts the pathname and allows an optional query string rather
    // than requiring/excluding confirmed=1 specifically.
    await expect(page).toHaveURL(/\/member(?:\?.*)?$/);

    // Log out lives in ProtectedHeader's account menu (M5.2 — see
    // docs/application-information-architecture.md's "User menu"), not
    // inline in the header as ProtectedNav had it. Open the menu first;
    // matched by a name *pattern* rather than the exact
    // "Account menu for {email}" string so this doesn't need to know the
    // trigger's exact label format, only that it exists.
    await page.getByRole("button", { name: /Account menu for/ }).click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/member");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fmember/);
  });
});
