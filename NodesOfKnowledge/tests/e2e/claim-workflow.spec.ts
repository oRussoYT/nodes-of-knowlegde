import { expect, test } from "./fixtures";

import { registerAndConfirm } from "./helpers/auth";

// Browser coverage for the M5.3 identity-claiming workflow
// (/member/claim, plus its effect on /member and /account).
//
// Person fixtures: every test that needs a claimable person gets its own
// unique, disposable one from the `claimablePerson` fixture (see
// fixtures.ts / helpers/people.ts) rather than a shared seed row. There is
// no client-reachable, app-level way to create a `people` row in this
// milestone, so the fixture mints one via the same trusted service-role
// setup path reviewer status already uses. Per-test isolation is what keeps
// this file deterministic under Playwright's default parallel (per-file)
// workers alongside claim-review.spec.ts, whose approve test irreversibly
// consumes its own person.
//
// Redirect-only coverage (unauthenticated access) lives in
// protected-routes.spec.ts, not repeated here. Duplicate-id/overflow/
// console/theme coverage for /member/claim itself lives in
// workspace-pages-quality.spec.ts's existing per-path loop, not repeated
// here either — this file is scoped to the workflow's own behavior.
//
// registerAndConfirm lives in helpers/auth.ts (shared with
// claim-review.spec.ts, M5.4).

test.describe("Claim discovery", () => {
  test("an authenticated user can search and find an eligible person record", async ({
    page,
    claimablePerson,
  }) => {
    await registerAndConfirm(page, "e2e-claim");
    await page.goto("/member/claim");

    await page.getByLabel("Search by name").fill(claimablePerson.searchTerm);
    await page.getByRole("button", { name: "Search" }).click();

    // Uncertainty framing is explicit, not implied — this is a possible
    // match, never asserted to be a confirmed identity.
    await expect(page.getByText(/possible match/i)).toBeVisible();
    await expect(page.getByText(claimablePerson.displayName)).toBeVisible();
    await expect(page.getByRole("button", { name: "Select" }).first()).toBeVisible();
  });

  test("a search with no eligible match shows the honest no-matches state, not an error", async ({
    page,
  }) => {
    await registerAndConfirm(page, "e2e-claim");
    await page.goto("/member/claim");

    await page.getByLabel("Search by name").fill("Zzyzyxqqnomatch");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByText("No matching person records found")).toBeVisible();
  });

  test("selecting a result moves keyboard focus to the confirmation step", async ({
    page,
    claimablePerson,
  }) => {
    await registerAndConfirm(page, "e2e-claim");
    await page.goto("/member/claim");

    await page.getByLabel("Search by name").fill(claimablePerson.searchTerm);
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByRole("button", { name: "Select" }).first().click();

    await expect(page.getByRole("heading", { name: "Confirm your claim" })).toBeFocused();
  });
});

test.describe("Claim submission, status, and duplicate prevention", () => {
  test("submitting a claim shows pending status on both /member and /account, blocks a second claim, and withdrawal reopens discovery", async ({
    page,
    claimablePerson,
  }) => {
    await registerAndConfirm(page, "e2e-claim");
    await page.goto("/member/claim");

    await page.getByLabel("Search by name").fill(claimablePerson.searchTerm);
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByRole("button", { name: "Select" }).first().click();
    await page.getByRole("button", { name: "Submit claim" }).click();

    await expect(page.getByText("Your claim has been submitted for review.")).toBeVisible();

    // Pending status on /member: names the person, explains what's
    // happening, offers withdrawal — never a fabricated profile/dashboard.
    await page.goto("/member");
    await expect(page.getByText(`${claimablePerson.displayName} is being reviewed`)).toBeVisible();
    const withdrawButton = page.getByRole("button", { name: "Withdraw claim" });
    await expect(withdrawButton).toBeVisible();

    // Account/member integration: /account shows the same status, as a
    // read-only display with no duplicate claim/search controls of its
    // own (see workspace-pages-quality.spec.ts for the "no such controls"
    // assertion in the no-claim case).
    await page.goto("/account");
    await expect(page.getByText(`${claimablePerson.displayName} is being reviewed`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Withdraw claim" })).toHaveCount(0);

    // Duplicate prevention: visiting /member/claim directly while a claim
    // is pending does not offer a new search — this is the page-level
    // half of the guard; submit-claim.ts enforces the same rule
    // server-side regardless of what the UI shows.
    await page.goto("/member/claim");
    await expect(page.getByLabel("Search by name")).toHaveCount(0);
    await expect(page.getByText(/already have a claim|being reviewed/i)).toBeVisible();

    // Withdrawal: back on /member, withdraw the pending claim. The
    // withdrawn outcome is shown honestly as its own state (not silently
    // reverted to "not yet connected", which would hide that a claim was
    // ever made — see derive-status.ts's priority ordering), and
    // /member/claim opens back up for a new search since withdrawn is not
    // a blocking state.
    await page.goto("/member");
    await page.getByRole("button", { name: "Withdraw claim" }).click();
    await expect(
      page.getByText(`You withdrew your claim on ${claimablePerson.displayName}`),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Search again" })).toHaveAttribute(
      "href",
      "/member/claim",
    );

    await page.goto("/member/claim");
    await expect(page.getByLabel("Search by name")).toBeVisible();
  });
});
