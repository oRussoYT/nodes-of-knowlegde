/**
 * Decides whether an internal, development-only route (e.g.
 * `/dev/design-system`) should refuse to render.
 *
 * Extracted as a pure function — rather than an inline
 * `if (process.env.NODE_ENV === "production")` check in the page
 * component — specifically so this decision is unit-testable without
 * needing a running server or a real production build (see
 * `tests/unit/dev-only-route.test.ts`). The page itself still calls
 * `next/navigation`'s `notFound()` when this returns `true`; that part is
 * one line and not meaningfully testable in isolation from Next's own
 * routing, which is why the decision, not the `notFound()` call, is what's
 * pulled out and tested here.
 *
 * Blocks on anything that isn't exactly `"development"` (rather than an
 * allowlist of only `"production"`), so the fail-safe direction is
 * "blocked" — a misconfigured or unexpected `NODE_ENV` value (e.g. `"test"`,
 * or unset) does not accidentally leave this route reachable.
 */
export function isDevOnlyRouteBlocked(nodeEnv: string | undefined): boolean {
  return nodeEnv !== "development";
}
