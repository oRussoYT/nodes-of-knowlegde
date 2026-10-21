import { expect, test } from "@playwright/test";

import { listMessageIds, waitForConfirmationLink } from "./helpers/mailpit";

const RECOVERY_FLOW_HINT_COOKIE = "netpdbff_recovery_flow_hint";

test.describe("/update-password scope", () => {
  test("a signed-in user without the recovery-flow hint sees 'Reset link required', not the password form", async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "correcthorse1";

    // Ordinary sign-up + confirm — never touches the recovery flow.
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();
    const confirmLink = await waitForConfirmationLink(email);
    await page.goto(confirmLink);
    await expect(page).toHaveURL(/\/member/);

    await page.goto("/update-password");

    await expect(page.getByRole("heading", { name: "Reset link required" })).toBeVisible();
    await expect(page.getByLabel("New password")).not.toBeVisible();
    await expect(page.getByText(/Account → Security/)).toBeVisible();
  });

  test("/account no longer links directly to /update-password", async ({ page }) => {
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

    await page.goto("/account");
    await expect(page.getByRole("link", { name: "Change password" })).toHaveCount(0);
    // /account's EmptyState now says "Account → Security" in *two* places
    // by design: its own descriptive sentence ("This will live under
    // Account → Security in a later milestone.") and the FutureAction
    // placeholder's label — so an unscoped getByText(/Account → Security/)
    // is ambiguous. What this test actually cares about is that the future
    // destination is represented, not the surrounding prose — that's the
    // FutureAction element specifically, identifiable by its `aria-disabled`
    // marker (see src/components/ui/FutureAction.tsx), not by text alone.
    await expect(page.locator('[aria-disabled="true"]', { hasText: "Account → Security" })).toBeVisible();
  });

  test("the recovery link grants one-time access to the password form", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "correcthorse1";
    const newPassword = "correcthorse2";

    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();
    const confirmLink = await waitForConfirmationLink(email);
    await page.goto(confirmLink);

    // Snapshot this inbox before requesting the reset: it already holds the
    // signup-confirmation message from above, so the next
    // waitForConfirmationLink call must ignore that message's ID or it can
    // (and did — see helpers/mailpit.ts) return that already-consumed link
    // instead of waiting for the new recovery one.
    const inboxBeforeReset = await listMessageIds(email);

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();

    const recoveryLink = await waitForConfirmationLink(email, {
      excludeMessageIds: inboxBeforeReset,
      expectedType: "recovery",
    });
    await page.goto(recoveryLink);

    await expect(page).toHaveURL(/\/update-password/);
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();

    // { exact: true }: "Confirm new password" contains "New password" as a
    // substring, and getByLabel matches substrings by default — without
    // this, the unscoped call resolves to both fields and throws a
    // strict-mode violation (see UpdatePasswordForm.tsx's two FormFields).
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();

    await expect(page.getByText("Your password has been updated.")).toBeVisible();

    // The recovery window is single-use: revisiting now shows the gated
    // state again, even though the session is still signed in.
    await page.goto("/update-password");
    await expect(page.getByRole("heading", { name: "Reset link required" })).toBeVisible();
  });
});

// Security-accuracy review: the recovery-flow hint cookie is a UX marker,
// not an authorization control (src/lib/auth/recovery-flow-hint.ts) — it
// is trivially forgeable (httpOnly only blocks *browser JavaScript* from
// setting it, not the cookie's own owner). These tests exercise exactly
// what forging it does and doesn't allow, so that claim isn't just
// asserted in a comment somewhere.
test.describe("Password-update authorization", () => {
  test("forging the hint cookie without a session still redirects to /login", async ({
    page,
    context,
  }) => {
    // No login anywhere in this test — this is the "missing session" case.
    await context.addCookies([
      {
        name: RECOVERY_FLOW_HINT_COOKIE,
        value: "1",
        url: "http://localhost:3000",
      },
    ]);

    await page.goto("/update-password");

    // src/app/(protected)/layout.tsx checks the real Supabase session
    // before /update-password's own page body — which is what actually
    // inspects this cookie — ever runs. The forged cookie is never even
    // read.
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fupdate-password/);
  });

  test("an authenticated user who forges the hint cookie can only ever change their own password", async ({
    page,
    context,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "correcthorse1";
    const newPassword = "correcthorse2";

    // Ordinary sign-up + confirm — this account never touches the real
    // recovery flow at all.
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();
    const confirmLink = await waitForConfirmationLink(email);
    await page.goto(confirmLink);
    await expect(page).toHaveURL(/\/member/);

    // Forge the hint cookie by hand — exactly what a curious or malicious
    // signed-in user could do via devtools.
    await context.addCookies([
      {
        name: RECOVERY_FLOW_HINT_COOKIE,
        value: "1",
        url: "http://localhost:3000",
      },
    ]);

    await page.goto("/update-password");
    // The forged cookie does get them past the UX gate...
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();

    // { exact: true } — see the identical note in the test above.
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();

    // ...but all it ever does is change the password of the account this
    // browser is already signed in as — exactly what a legitimate
    // "change your password while signed in" action would do. Confirm by
    // logging in again with the *new* password for the *same* account.
    await expect(page.getByText("Your password has been updated.")).toBeVisible();

    // Must log out first: the session from registration is still active
    // (updating a password doesn't end it), and src/lib/auth/route-protection.ts
    // correctly redirects an already-authenticated visitor away from
    // /login — so without this, page.goto("/login") never shows the login
    // form at all (confirmed via trace: the page snapshot at the timeout
    // was /member, not /login), and the "log in again" step below wasn't
    // actually re-verifying anything even when it appeared to pass.
    //
    // Log out lives in ProtectedHeader's account menu (M5.2) — open it
    // first, same as login.spec.ts's logout test.
    await page.getByRole("button", { name: /Account menu for/ }).click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // #email, not getByLabel("Email"): /login now also renders the
    // "Didn't get a confirmation email?" ResendConfirmationForm's own
    // "Email" field (id="resend-email", present in the DOM though
    // collapsed — see ResendConfirmationForm.tsx). Both are correctly
    // labeled "Email", so an unscoped getByLabel is a strict-mode
    // violation; the login form's field has the stable id="email"
    // (src/app/(public)/login/LoginForm.tsx's FormField derives it from
    // name="email"). "Password" is unambiguous — the resend form has no
    // password field — so it's left as-is.
    await page.locator("#email").fill(email);
    await page.getByLabel("Password").fill(newPassword);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/member/);
  });
});
