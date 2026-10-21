import { type Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { registerAndConfirm } from "./helpers/auth";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";
import { getUserIdByEmail, grantReviewerStatus, revokeReviewerStatus } from "./helpers/reviewer";

// Browser coverage for the M5.4 claim-review workflow (/review/claims,
// /review/claims/[claimId], plus its effect on /member and /account).
//
// Person fixtures: every test that needs a claimable person gets its own
// unique, disposable one from the `claimablePerson` fixture (see
// fixtures.ts / helpers/people.ts) — no shared seed rows. This is what makes
// the file deterministic under Playwright's default parallel (per-file)
// workers: the approve test below approves a claim, which permanently
// consumes *its own* fixture person (an approved claim creates an
// irreversible, one-per-person user_person_links row — there is no
// client-reachable "unclaim"; see
// docs/decisions/0009-reviewer-authorization-table.md). Because that person
// is private to that test, the consumption is invisible to every other test
// and every other worker. The fixture teardown deliberately retains an
// approved-linked person until the next `supabase db reset` rather than
// force-deleting the link (see helpers/people.ts's deleteClaimablePerson).
//
// Requires SUPABASE_SERVICE_ROLE_KEY in the environment (see
// helpers/service-role.ts) for every test that needs an authorized-reviewer
// session or a disposable person — there is no client-facing way to
// construct either, by design. The two access-denial tests need neither and
// so require no service-role key.

function uniqueEmailPrefix(tag: string): string {
  return `e2e-review-${tag}`;
}

async function submitClaim(page: Page, personSearchTerm: string, evidence?: string): Promise<void> {
  await page.goto("/member/claim");
  await page.getByLabel("Search by name").fill(personSearchTerm);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "Select" }).first().click();
  if (evidence) {
    await page.getByLabel("Supporting note (optional)").fill(evidence);
  }
  await page.getByRole("button", { name: "Submit claim" }).click();
  await expect(page.getByText("Your claim has been submitted for review.")).toBeVisible();
}

/**
 * Locates one specific claimant's row in the review queue, scoped by both
 * the claimed person's name and the claimant's email. The queue is shared,
 * non-isolated state across every test in this file — even with per-test
 * unique people, scoping the row lookup by claimant email too keeps each
 * lookup deterministic regardless of what other tests (or a previous partial
 * run) left in the queue, and guards against a Playwright strict-mode
 * violation if any name ever recurs.
 */
function queueRow(page: Page, personName: string, claimantEmail: string) {
  return page.locator("main ul li", { hasText: personName }).filter({ hasText: claimantEmail });
}

test.describe("Access control", () => {
  test("an authenticated user who is not a reviewer sees a permission-denied state, not the queue", async ({
    page,
  }) => {
    await registerAndConfirm(page, uniqueEmailPrefix("ordinary"));

    // Nav visibility is derived from live reviewer status, not shown to an
    // ordinary account.
    await expect(page.getByRole("link", { name: "Claim review" })).toHaveCount(0);

    await page.goto("/review/claims");
    await expect(page.getByRole("heading", { name: "Claim review" })).toBeVisible();
    await expect(page.getByText("You don't have access to the reviewer area")).toBeVisible();
    // Never the queue itself, and never a claim id enumerated in its place.
    await expect(page.locator("main ul li")).toHaveCount(0);
  });

  test("the permission-denied state also applies to a specific claim id, not just the queue root", async ({
    page,
  }) => {
    await registerAndConfirm(page, uniqueEmailPrefix("ordinary-detail"));

    await page.goto("/review/claims/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText("You don't have access to the reviewer area")).toBeVisible();
  });
});

test.describe("Authorized reviewer — queue, detail, and evidence scoping", () => {
  test("an active reviewer sees the nav link, the queue, and full claim detail including evidence", async ({
    page,
    browser,
    claimablePerson,
  }) => {
    // A separate claimant account and browser context submits a claim
    // first, so the reviewer account below has something real to review.
    const claimantContext = await browser.newContext();
    const claimantPage = await claimantContext.newPage();
    const claimantEmail = await registerAndConfirm(claimantPage, uniqueEmailPrefix("claimant-queue"));
    await submitClaim(claimantPage, claimablePerson.searchTerm, "I corresponded with the PDBFF working group in the 1990s.");
    await claimantContext.close();

    const reviewerEmail = await registerAndConfirm(page, uniqueEmailPrefix("reviewer-queue"));
    const reviewerId = await getUserIdByEmail(reviewerEmail);
    await grantReviewerStatus(reviewerId);

    await page.goto("/member");
    await expect(page.getByRole("link", { name: "Claim review" })).toBeVisible();

    await page.goto("/review/claims");
    await expect(page.getByRole("heading", { name: "Claim review" })).toBeVisible();

    const row = queueRow(page, claimablePerson.displayName, claimantEmail);
    await expect(row).toBeVisible();
    await expect(row.getByText("Submitted", { exact: true })).toBeVisible();

    await row.getByRole("link").click();
    await expect(page.getByRole("heading", { name: `Review: ${claimablePerson.displayName}` })).toBeVisible();

    // The four clearly-separated sections the milestone requires, each its
    // own card — never blended into one fact list.
    await expect(page.getByRole("heading", { name: "Claimant account" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Claimed person record" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Claimant statement" })).toBeVisible();

    // Evidence is visible to the authorized reviewer.
    await expect(
      page.getByText("I corresponded with the PDBFF working group in the 1990s."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Begin review" })).toBeVisible();

    // Never implies name similarity proves identity.
    await expect(page.getByText("Name similarity alone does not confirm identity.")).toBeVisible();
  });
});

test.describe("Self-review denial", () => {
  test("an active reviewer cannot begin review on their own claim", async ({ page, claimablePerson }) => {
    const email = await registerAndConfirm(page, uniqueEmailPrefix("self"));
    await submitClaim(page, claimablePerson.searchTerm);

    const userId = await getUserIdByEmail(email);
    await grantReviewerStatus(userId);

    await page.goto("/review/claims");
    await queueRow(page, claimablePerson.displayName, email).getByRole("link").click();
    await page.getByRole("button", { name: "Begin review" }).click();

    await expect(page.getByText("You cannot review your own claim.")).toBeVisible();
  });
});

test.describe("Revoked reviewer", () => {
  test("access is denied immediately once reviewer status is revoked, with no sign-out/sign-in required", async ({
    page,
    browser,
  }) => {
    const email = await registerAndConfirm(page, uniqueEmailPrefix("revoked"));
    const userId = await getUserIdByEmail(email);
    await grantReviewerStatus(userId);

    await page.goto("/review/claims");
    await expect(page.getByRole("heading", { name: "Claim review" })).toBeVisible();
    await expect(page.getByText("You don't have access to the reviewer area")).toHaveCount(0);

    // Revoked by a second, distinct reviewer account (reviewers_no_self_revoke).
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    const otherEmail = await registerAndConfirm(otherPage, uniqueEmailPrefix("revoker"));
    const otherId = await getUserIdByEmail(otherEmail);
    await grantReviewerStatus(otherId);
    await otherContext.close();

    await revokeReviewerStatus(userId, otherId);

    await page.reload();
    await expect(page.getByText("You don't have access to the reviewer area")).toBeVisible();
  });
});

test.describe("Approve workflow — claimant-visible outcome", () => {
  test("approving a claim links the account, and the claimant sees a real, non-fabricated linked state on /member and /account", async ({
    page,
    browser,
    claimablePerson,
  }) => {
    // Setup-bound (not a flaky assertion): two full register+confirm flows
    // (Mailpit) + submitClaim + grant + queue navigation precede the approval
    // assertions. Under `next dev`, on-demand route compilation makes these
    // navigations slow (the trace showed goto /member/claim ~10s, Select ~11s);
    // extend the budget for the genuine setup cost without weakening any check.
    test.slow();
    const claimantContext = await browser.newContext();
    const claimantPage = await claimantContext.newPage();
    const claimantEmail = await registerAndConfirm(claimantPage, uniqueEmailPrefix("claimant-approve"));
    await submitClaim(claimantPage, claimablePerson.searchTerm);

    const reviewerEmail = await registerAndConfirm(page, uniqueEmailPrefix("reviewer-approve"));
    const reviewerId = await getUserIdByEmail(reviewerEmail);
    await grantReviewerStatus(reviewerId);

    await page.goto("/review/claims");
    await queueRow(page, claimablePerson.displayName, claimantEmail).getByRole("link").click();
    await page.getByRole("button", { name: "Begin review" }).click();
    await expect(page.getByRole("button", { name: "Approve claim" })).toBeVisible();

    // Confirmation dialog: Cancel does not approve.
    await page.getByRole("button", { name: "Approve claim" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Approve this claim?")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("heading", { name: `Review: ${claimablePerson.displayName}` })).toBeVisible();

    // Now actually confirm.
    await page.getByRole("button", { name: "Approve claim" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Approve claim" }).click();

    // A successful approval shows the reviewer a calm confirmation. That
    // confirmation is transient by design: ReviewDecisionActions renders the
    // "Claim approved." role="status" message (announcing it to assistive tech
    // and moving focus to it) and, in the same success effect, calls
    // router.refresh(); the refresh re-reads the now-decided claim and swaps
    // ReviewDecisionActions out for the durable "Review decision" recorded view,
    // which UNMOUNTS the toast. Asserting only the ephemeral toast races that
    // refresh (it deterministically loses when the RSC refetch completes before
    // Playwright polls -- the identical race the Reject test handles). Assert the
    // reviewer-visible success robustly: whichever of the two is present -- the
    // toast, or the durable decided view it is replaced by -- confirms the
    // approval landed. The durable "Resulting link: Active" (asserted after the
    // reload below) and the claimant's real linked state on /member and /account
    // remain the substantive, non-racy guarantees this test exists to prove.
    await expect(
      page.getByText("Claim approved.").or(page.getByRole("heading", { name: "Review decision" })),
    ).toBeVisible();

    // Repeated-decision prevention: reloading the same claim no longer
    // offers any decision action, and shows the recorded decision instead.
    await page.reload();
    await expect(page.getByRole("button", { name: "Approve claim" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reject claim" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Review decision" })).toBeVisible();
    await expect(page.getByText(/Resulting link:\s*Active/)).toBeVisible();

    await claimantPage.goto("/member");
    await expect(claimantPage.getByText(`Your account is linked to ${claimablePerson.displayName}`)).toBeVisible();
    // No fabricated participation/network/publication content.
    const fabricatedMetricPattern =
      /\b\d[\d,]*\+?\s*(participations?|publications?|institutions?|projects?|relationships?|collaborators?|connections?|records?)\b/i;
    await expect(claimantPage.getByText(fabricatedMetricPattern)).toHaveCount(0);

    // Production Experience Phase I: the approved claimant now has a doorway
    // from the (deliberately secondary) Member area straight to their own
    // canonical Person page — the one reading link the Member area offers, and
    // never a dead end after approval.
    const linkedRecord = claimantPage.getByRole("link", { name: "Read your linked record" });
    await expect(linkedRecord).toHaveAttribute("href", `/people/${claimablePerson.id}`);
    await linkedRecord.click();
    await expect(claimantPage).toHaveURL(new RegExp(`/people/${claimablePerson.id}$`));
    await expect(claimantPage.getByRole("heading", { level: 1 })).toHaveCount(1);

    await claimantPage.goto("/account");
    await expect(claimantPage.getByText(`Your account is linked to ${claimablePerson.displayName}`)).toBeVisible();
    // The claimant never sees who reviewed their claim.
    await expect(claimantPage.getByText(reviewerEmail)).toHaveCount(0);

    await claimantContext.close();
  });
});

test.describe("Reject workflow — claimant-visible outcome", () => {
  test("rejecting a claim with a note shows the claimant a calm, neutral outcome and the note, never the reviewer's identity", async ({
    page,
    browser,
    claimablePerson,
  }) => {
    const claimantContext = await browser.newContext();
    const claimantPage = await claimantContext.newPage();
    const claimantEmail = await registerAndConfirm(claimantPage, uniqueEmailPrefix("claimant-reject"));
    await submitClaim(claimantPage, claimablePerson.searchTerm);

    const reviewerEmail = await registerAndConfirm(page, uniqueEmailPrefix("reviewer-reject"));
    const reviewerId = await getUserIdByEmail(reviewerEmail);
    await grantReviewerStatus(reviewerId);

    await page.goto("/review/claims");
    await queueRow(page, claimablePerson.displayName, claimantEmail).getByRole("link").click();
    await page.getByRole("button", { name: "Begin review" }).click();
    await expect(page.getByRole("button", { name: "Reject claim" })).toBeVisible();

    await page.getByRole("button", { name: "Reject claim" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Reject this claim?")).toBeVisible();
    await dialog.getByLabel("Note to claimant (optional)").fill("Name does not match the historical record.");
    await dialog.getByRole("button", { name: "Reject claim" }).click();

    // A successful rejection shows the reviewer a calm confirmation. That
    // confirmation is transient by design: ReviewDecisionActions renders the
    // "Claim rejected." role="status" message (announcing it to assistive tech
    // and moving focus to it) and, in the same success effect, calls
    // router.refresh(); the refresh re-reads the now-decided claim and swaps
    // ReviewDecisionActions out for the durable "Review decision" recorded
    // view, which UNMOUNTS the toast. Asserting only the ephemeral toast races
    // that refresh (it deterministically loses when the RSC refetch completes
    // before Playwright polls). The role="status" + focus behaviour is a
    // property of the shared ReviewDecisionActions component and is intentionally
    // transient; it is not deterministically assertable end-to-end because the
    // same router.refresh() unmounts the toast (the Approve test above handles
    // the identical race the same way). Assert the reviewer-visible success
    // robustly: whichever of the two is present -- the toast, or the durable
    // decided view it is replaced by -- confirms the rejection landed.
    await expect(
      page.getByText("Claim rejected.").or(page.getByRole("heading", { name: "Review decision" })),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Approve claim" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reject claim" })).toHaveCount(0);

    await claimantPage.goto("/member");
    await expect(claimantPage.getByText(`Your claim on ${claimablePerson.displayName} was not approved`)).toBeVisible();
    await expect(claimantPage.getByText(/Reviewer note: Name does not match the historical record\./)).toBeVisible();
    // Calm and neutral: no reviewer email or internal-only detail reaches
    // the claimant.
    await expect(claimantPage.getByText(reviewerEmail)).toHaveCount(0);
    await expect(claimantPage.getByRole("link", { name: "Search again" })).toHaveAttribute(
      "href",
      "/member/claim",
    );

    await claimantContext.close();
  });
});

test.describe("/review/claims — browser quality", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`the queue loads with no console errors, hydration warnings, duplicate ids, or horizontal overflow at 375px (${theme} theme)`, async ({
      page,
    }) => {
      const issues = attachConsoleWatcher(page);
      await page.setViewportSize({ width: 375, height: 812 });

      const email = await registerAndConfirm(page, uniqueEmailPrefix(`quality-${theme}`));
      const userId = await getUserIdByEmail(email);
      await grantReviewerStatus(userId);

      await setStoredTheme(page, theme);
      await page.goto("/review/claims");
      await page.waitForLoadState("networkidle");

      expect(issues, issues.join("\n")).toEqual([]);

      const duplicates = await getDuplicateIds(page);
      expect(duplicates, `duplicate ids: ${duplicates.join(", ")}`).toEqual([]);

      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});
