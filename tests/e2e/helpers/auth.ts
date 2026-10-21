// Shared "register a fresh account and confirm it via Mailpit" flow, used
// by every spec that needs a logged-in session but isn't itself testing
// registration/confirmation (that's register.spec.ts's job). Extracted
// from claim-workflow.spec.ts so claim-review.spec.ts doesn't duplicate
// it — both need an ordinary logged-in claimant account, and
// claim-review.spec.ts additionally needs it for reviewer accounts before
// granting them reviewer status (see helpers/reviewer.ts).

import type { Page } from "@playwright/test";

import { waitForConfirmationLink } from "./mailpit";

/** Registers a fresh account with a generated email, confirms it via the
 * Mailpit link, and leaves `page` on the post-confirmation, logged-in
 * state. Returns the email so the caller can look the account up again
 * later (e.g. by a service-role connection — see helpers/reviewer.ts). */
export async function registerAndConfirm(page: Page, emailPrefix = "e2e"): Promise<string> {
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "correcthorse1";

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  const confirmLink = await waitForConfirmationLink(email);
  await page.goto(confirmLink);

  return email;
}
