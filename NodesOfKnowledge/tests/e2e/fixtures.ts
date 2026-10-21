// Test-scoped Playwright fixtures for the claim flows.
//
// The `claimablePerson` fixture is the architectural core of the suite's
// determinism under parallel execution: every test that needs a claimable
// person gets its OWN uniquely-named, disposable one, created before the test
// and cleaned up after (where cleanup is valid — see below). No test shares a
// seeded person with any other, so no test's precondition ("this person is
// still claimable") can be invalidated by another worker. New specs get this
// isolation for free by importing `test` from here instead of
// "@playwright/test" — the guarantee is structural, not a naming convention.
//
// Only tests that destructure `claimablePerson` trigger its creation/
// teardown (Playwright fixtures are lazy), so the many tests that need no
// person (auth pages, access-control, empty-queue quality scans) are
// unaffected and pay nothing.

import { test as base, expect } from "@playwright/test";

import {
  createClaimablePerson,
  deleteClaimablePerson,
  type ClaimablePerson,
} from "./helpers/people";

interface ClaimFixtures {
  claimablePerson: ClaimablePerson;
}

export const test = base.extend<ClaimFixtures>({
  claimablePerson: async ({}, use, testInfo) => {
    const person = await createClaimablePerson();

    await use(person);

    // Teardown. deleteClaimablePerson retains (does not delete, does not
    // throw) a person that an approval irreversibly linked — that row lives
    // until the next `supabase db reset`, by design. Surface that retention
    // as a visible note rather than hiding it; any genuine cleanup error
    // still propagates and fails the run.
    const result = await deleteClaimablePerson(person.id);
    if (!result.deleted) {
      testInfo.annotations.push({
        type: "fixture:claimablePerson retained",
        description: `${person.displayName} (${person.id}): ${result.retainedReason}`,
      });
    }
  },
});

export { expect };
