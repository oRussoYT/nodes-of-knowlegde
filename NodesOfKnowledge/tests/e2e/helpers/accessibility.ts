// Shared axe-core scanning helper for the M5.5 automated accessibility
// pass (tests/e2e/accessibility.spec.ts). Wraps @axe-core/playwright --
// proposed in docs/m5-application-ui-design-system.md item 10's "Proposed
// new dependencies" and installed in M5.5 to actually implement that
// item's acceptance criterion -- so every accessibility test runs the same
// configured scan and the same critical/serious gate, rather than each
// test hand-rolling AxeBuilder options and its own violation-formatting
// logic. Generic and route-agnostic by design: nothing here is
// Nodes BDFFP/PDBFF-specific, consistent with
// docs/decisions/0007-netpdbff-first-vertical-general-research-infrastructure.md's
// naming discipline for shared test/helper infrastructure -- any future
// product built on this architecture could reuse this file unchanged.

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// The violation-result type is derived from AxeBuilder#analyze()'s own
// return type rather than imported from "axe-core" directly. axe-core's
// own type definitions ship as a `export = axe` namespace (not a set of
// named exports), and the exact re-export shape @axe-core/playwright
// presents on top of it isn't worth coupling to by name here -- deriving
// the type structurally is correct regardless of that detail and needs no
// second import.
type AxeAnalyzeResult = Awaited<ReturnType<InstanceType<typeof AxeBuilder>["analyze"]>>;
type Violation = AxeAnalyzeResult["violations"][number];

/** WCAG levels this project holds itself to --
 * docs/design-system-architecture.md's "Accessibility requirements": WCAG
 * 2.1 AA as the floor, not an aspiration. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** A narrowly targeted axe exclusion. Only permitted for a confirmed
 * third-party false positive, per this milestone's explicit constraint --
 * `reason` is required (not optional) so an exclusion cannot be added
 * without stating, right next to the call site that uses it, why it's safe
 * and what still verifies the excluded interaction manually/semantically.
 * No exclusion is used anywhere in accessibility.spec.ts as of M5.5; this
 * type exists so one can be added later without inventing the mechanism
 * under time pressure. */
export interface AccessibilityExclusion {
  /** CSS selector passed to AxeBuilder#exclude. */
  selector: string;
  /** Why this selector is excluded: which third-party element it targets,
   * why the violation is a false positive, and what still confirms the
   * underlying interaction is actually accessible. */
  reason: string;
}

export interface AccessibilityScanOptions {
  exclusions?: AccessibilityExclusion[];
}

/**
 * Runs an axe-core scan of the current page state (whatever `page` is
 * showing right now -- navigate and reach the state under test first, then
 * call this) scoped to WCAG 2.1 A/AA rules. Returns the raw violation list;
 * callers assert on it via `assertNoSeriousOrCriticalViolations` below
 * rather than inlining the filter/format logic at every call site.
 */
export async function runAccessibilityScan(page: Page, options: AccessibilityScanOptions = {}): Promise<Violation[]> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);

  for (const exclusion of options.exclusions ?? []) {
    builder = builder.exclude(exclusion.selector);
  }

  const results = await builder.analyze();
  return results.violations;
}

/** Impact levels this milestone's acceptance criteria fail the build on --
 * docs/m5-application-ui-design-system.md item 10: "no critical/serious
 * violations." `moderate`/`minor` findings are deliberately not asserted
 * on here -- that matches the milestone's own written acceptance
 * criterion, not a weakened check invented for M5.5. */
const FAILING_IMPACTS = new Set(["critical", "serious"]);

/**
 * Fails the current test with a readable, per-violation breakdown if any
 * critical/serious axe violation is present in `violations` (the result of
 * `runAccessibilityScan`). Uses the same `expect(array, message).toEqual([])`
 * idiom as `getDuplicateIds`/`hasHorizontalOverflow` in ./page-quality.ts,
 * so a failure reads the same way in the Playwright report as every other
 * browser-quality assertion in this suite.
 */
export function assertNoSeriousOrCriticalViolations(violations: Violation[]): void {
  const failing = violations
    .filter((violation) => FAILING_IMPACTS.has(violation.impact ?? ""))
    .map((violation) => {
      const targets = violation.nodes.map((node) => node.target.join(" ")).join(", ");
      return `[${violation.impact}] ${violation.id}: ${violation.help} (${violation.helpUrl}) -- targets: ${targets}`;
    });

  expect(failing, failing.join("\n")).toEqual([]);
}
