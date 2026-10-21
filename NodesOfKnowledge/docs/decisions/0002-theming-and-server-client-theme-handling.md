# 0002. Theming approach and server/client theme handling

Date: 2026-08-01
Status: Proposed

## Context

M4 already renders both light and dark appearances, but purely through
`prefers-color-scheme` media queries and hand-repeated `dark:` Tailwind
classes (`src/app/globals.css` defines exactly two swapped CSS variables;
every component repeats `dark:border-neutral-800` etc. inline). There is
no way for a visitor to override their OS setting, and no token layer —
every new M5 component would otherwise repeat the same
`dark:`-class-per-property pattern by hand.

M5 needs: a real token system with light/dark values (per
`docs/design-system-architecture.md`), a user-facing override (item 11 of
`docs/m5-application-ui-design-system.md`), no flash of incorrectly-themed
content on first paint, and a decision about where "which theme is
active" is determined — server-rendered HTML, a client-only script, or
some combination — given that most of this app's pages are Server
Components and several are statically rendered
(`docs/decisions/0006-public-static-shell-vs-authenticated-dynamic-shell.md`).
This last question ("server vs. client theme handling") is treated as
part of this same decision rather than a separate ADR, because it has no
independent answer — how the initial theme is determined is inseparable
from how theming is implemented at all.

## Decision

Use **CSS custom properties driven by a `data-theme` attribute on
`<html>`, with no new runtime dependency**:

- Every semantic token in `docs/design-system-architecture.md` is defined
  twice in `globals.css` — once under `:root` / `[data-theme="light"]`,
  once under `[data-theme="dark"]` — exposed to Tailwind via `@theme
  inline`, exactly as the current two-variable setup already does, just
  extended to the full token set.
- A small, inline, synchronous script in the root `<head>` (not a
  `"use client"` component — a literal `<script>` tag, matching the
  standard no-FOUC pattern used by most hand-rolled and library-based
  theme systems alike) reads a persisted preference
  (`localStorage`, falling back to a cookie only if needed for
  consistency with future server-rendered theme-aware output) and a
  cookie set once the user has made an explicit choice, and sets
  `data-theme` on `<html>` **before** the rest of the page paints. This
  is what prevents the flash of wrong-theme content — it must run before
  first paint, which is why it's a blocking inline script, not a
  `useEffect`.
- If no explicit preference has ever been recorded, no `data-theme`
  attribute is set at all, and the CSS falls back to
  `prefers-color-scheme` (today's exact behavior) via a
  `@media (prefers-color-scheme: dark)` block scoped to the
  no-`data-theme` case. A first-time visitor's experience is therefore
  unchanged from today.
- The toggle control (a future `Switch`, per the component table) is a
  small Client Component that writes the preference to `localStorage`
  and a cookie, and sets `data-theme` on `<html>` directly (via
  `document.documentElement`) — no page reload required.
- **No server-side theme determination beyond the inline script above.**
  Server Components render theme-agnostic markup (relying entirely on the
  CSS custom properties resolving correctly for whichever `data-theme` the
  client-side script has already set); no Server Component branches its
  output based on a cookie-read theme value. This keeps every currently-
  static public page (`docs/decisions/0006-...md`) static — a
  server-side theme read would force those routes dynamic, which is
  exactly the cost M4 already paid down once for authentication state and
  should not reintroduce for theming.

## Alternatives considered

**`next-themes` (or an equivalent small theming library).** The most
common off-the-shelf answer to this exact problem, and technically sound
— it implements essentially the same inline-script/no-FOUC pattern this
ADR describes, packaged and battle-tested. Rejected for M5 specifically
because the problem it solves is small, well-understood, and already
matches this repository's established posture of not adding a dependency
for something a few dozen lines can do correctly (the same reasoning
`docs/authentication-implementation.md` gives for not adding a form/schema
library). If the hand-rolled version proves fragile in implementation,
revisiting this decision in favor of `next-themes` is a low-cost,
well-contained change — the token structure above doesn't need to change
either way.

**Server-side theme cookie read on every request (theme decided in
Server Components, like session state is).** Rejected: unlike
authentication, theme has no security or correctness requirement to be
verified server-side — getting it wrong for one paint is a cosmetic
flicker, not a vulnerability. Paying the "force every route dynamic" cost
`docs/decisions/0006-...md` deliberately avoided for auth state would be
a worse tradeoff here, for a purely cosmetic concern.

**CSS-only (`prefers-color-scheme` alone, no override — i.e., keep M4's
current behavior and simply extend the token set).** Rejected because
M5's own scope (item 11) explicitly requires a user-facing override; this
was the starting point, not a viable end state.

## Consequences

**Makes easier:** every future component authored against semantic tokens
automatically supports both themes and the user override with zero
per-component dark-mode logic; public routes stay statically rendered;
adding `next-themes` later, if ever needed, is a contained swap rather
than a rearchitecture.

**Makes harder:** the inline no-FOUC script is easy to get subtly wrong
(timing, CSP concerns if a strict Content-Security-Policy is ever added —
inline scripts need a nonce or hash under a strict CSP, which doesn't
exist yet in this project but is worth flagging for whoever adds one
later) and needs its own careful review and testing, work a library would
otherwise have absorbed.

## Risks

Inline `<script>` tags run outside React's control and are easy to get
wrong in ways that only show up as an intermittent flash — this needs
explicit manual verification (hard reload, both themes, both as a
first-time visitor and a returning one with a stored preference) as part
of M5's acceptance criteria, not just an automated check.
