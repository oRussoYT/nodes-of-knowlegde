# Authentication Implementation — Milestone M4

## Status

This document describes what M4 actually built: a complete email-and-password
authentication vertical slice on Next.js 16 (App Router) and Supabase Auth,
built on top of the M3.1 identity foundation (`docs/database-implementation.md`).
It does not implement — and this document does not describe — profile
claiming, person creation, institutions/participation, social login, MFA, or
any hosted/production deployment. See "What remains" at the end.

**This milestone's code had not been run as of its original authoring.**
The sandbox it was authored in had no Docker (so no local Supabase stack —
Postgres, Auth, Mailpit — could be started) and no network access to the
npm registry (so `vitest` and `@playwright/test`, added as devDependencies,
could not be installed). That was the same limitation
`docs/database-implementation.md` documented for M3.1's pgTAP tests. **This
is no longer the current state** — see "Automated tests" below, rewritten
as of M5.5, for the real, locally-executed suite composition and counts.
The sandbox limitation described above only ever applied to the environment
this document was first written in, never to the person running these
commands on their own machine, which is how every suite below has actually
been executed and validated since.

**Revision note (post-implementation quality review).** After the initial
build described throughout this document, a focused review pass changed
several things before any local validation had run: `/update-password` is
now gated to actual password-recovery intent rather than doubling as a
general "change your password" page; a neutral resend-confirmation flow was
added; the password policy was centralized and Supabase's own
`password_requirements` was brought into exact agreement with it; login's
error mapping was tightened for account-enumeration safety; the app-wide
header was split into a static public header and an authenticated nav
scoped to protected routes only (so the public landing page stays statically
rendered); and six explicit user-facing states were added. Each change is
described in its own section below, in place — this isn't a separate
addendum.

**Revision note (security-accuracy correction).** A further pass corrected
two things before local validation: the recovery cookie's naming and
documentation overclaimed what an `httpOnly` cookie can guarantee (it is a
UX flow marker, not an authorization control — see "`/update-password`
scope" and "Password-update authorization" below), and this document's own
test-result language conflated *authored* test cases with *passing* ones.
Both corrections are described in place, in their own sections, not as a
separate addendum.

**Revision note (test-toolchain dependency upgrade).** A subsequent, narrow
pass upgraded `vitest` from `^2.1.8` to `^4.1.10` to resolve a transitive
`esbuild` vulnerability flagged by `npm audit` — see "Test-toolchain
dependency upgrade" below. No application behavior or test logic changed.

## Architecture

```
src/
  proxy.ts                        Next.js 16 request interceptor (session refresh + route decisions)
  lib/
    supabase/
      env.ts                      Shared, validated environment-variable access
      client.ts                   Browser Supabase client (Client Components)
      server.ts                   Server Supabase client (Server Components/Actions/Route Handlers)
      proxy.ts                    updateSession() — session-refresh helper used by src/proxy.ts
    auth/
      validation.ts                Dependency-free form validation + sanitizeReturnTo()
      password-policy.ts           Single source of truth for password rules — mirrors supabase/config.toml
      errors.ts                    Maps Supabase Auth errors to safe, generic copy (enumeration-safe)
      route-protection.ts          Pure, unit-tested route-protection decision logic
      recovery-flow-hint.ts        Short-lived, unsigned UX-only cookie hinting at recovery-link origin — not an authorization control, see "/update-password scope"
  features/
    auth/
      actions/                     Server Actions: register, login, logout, forgot-password,
                                    update-password, resend-confirmation
  components/
    ui/                            FormField, SubmitButton, FormMessage (generic primitives)
    layout/
      PublicHeader.tsx             Static, no-auth-check header — every route using the root layout
      ProtectedNav.tsx             Authenticated nav — rendered only inside (protected)/layout.tsx
    auth/
      LogoutButton.tsx             Server Action-backed logout form
      ResendConfirmationForm.tsx   Neutral resend-confirmation UI with a client-side cooldown
  app/
    login/, register/, forgot-password/   Public auth pages (Server Component page + Client Component form)
    auth/confirm/route.ts          Token-exchange endpoint (signup confirmation + password recovery)
    auth/error/page.tsx            Generic "link didn't work" page
    (protected)/layout.tsx         Independent session re-verification + ProtectedNav for /member, /account, /update-password
    (protected)/member/, account/, update-password/
supabase/
  templates/confirmation.html, recovery.html   Custom local email templates (PKCE token_hash links)
tests/
  unit/                            Vitest — validation.ts, route-protection.ts, password-policy.ts, errors.ts, recovery-flow-hint.ts
  e2e/                             Playwright — full browser flows against local Supabase + Mailpit
```

This follows `docs/architecture.md`: business logic (validation, error
mapping, route decisions, Server Actions) lives outside `src/components`;
`src/components/ui` holds only generic, reusable primitives, not an auth
design system; the auth module lives at `src/features/auth`.

## Architectural boundary preserved

Per `docs/decisions/0001-separate-people-from-user-accounts.md`, registration
(`src/features/auth/actions/register.ts`) calls only `supabase.auth.signUp()`.
Nothing in this milestone inserts into `people`, `profile_claims`, or
`user_person_links` — grep the diff for those table names and the only hits
are in comments explaining why they're absent. `/member` explicitly tells an
authenticated user their account isn't yet connected to a person record, and
does not query `people` in any way.

## Route map

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Existing landing page (unchanged) |
| `/login` | Public; redirects away if already authenticated | Sign in |
| `/register` | Public; redirects away if already authenticated | Create an Auth account only |
| `/forgot-password` | Public | Request a password-reset email (always neutral response) |
| `/auth/confirm` | Public (Route Handler) | Token exchange for both signup confirmation and password recovery |
| `/auth/error` | Public | Generic "this link didn't work" landing page |
| `/member` | Authenticated | Minimal member home; explains account vs. person-record status; logout |
| `/account` | Authenticated | Minimal Auth-account info (email, confirmation status, created date) |
| `/update-password` | Authenticated **and** recovery-flow-hint-gated (UX only) | Complete a password reset started from the recovery email link — see "/update-password scope" |

## Route-access matrix

Four access levels are relevant to this codebase: **Public** (no session),
**Authenticated account** (a session exists — everything this milestone
implements), and two levels that don't exist yet anywhere in the code —
**Future linked NetPDBFF member** (an authenticated account with an
*approved* `user_person_links` row, per
`docs/decisions/0001-separate-people-from-user-accounts.md`) and **Future
administrator** (a general administrator role — still doesn't exist, and
is not what M5.4 built; see the note below the table). The last two
columns describe *intended future gating*, not anything enforced today —
every current route's actual enforcement is exactly what "Public" or
"Authenticated account" says.

| Route | Public | Authenticated account | Future linked member | Future administrator |
|---|---|---|---|---|
| `/` | ✅ | ✅ | ✅ | ✅ |
| `/login`, `/register`, `/forgot-password` | ✅ | Redirected away (already signed in) | Redirected away | Redirected away |
| `/auth/confirm`, `/auth/error` | ✅ | ✅ | ✅ | ✅ |
| `/member` | ❌ → `/login` | ✅ | ✅ (same page — no distinct "member" content exists yet) | ✅ |
| `/account` | ❌ → `/login` | ✅ | ✅ | ✅ |
| `/update-password` | ❌ → `/login` | Any authenticated account; the recovery-flow hint (see below) only picks which page state renders, not whether the route is reachable | Same rule | Same rule |
| *(future)* a person/profile page | — | ❌ (no linked person to view) | ✅ own record; others per `docs/privacy-model.md` visibility | ✅ plus moderation actions |
| *(future)* an admin claim-review queue | — | ❌ | ❌ | ✅ only |

Nothing in this table implies the future columns are implemented — see
"Future security work" below for what's documented but deliberately not
built yet.

**M5.4 update.** The "an admin claim-review queue" row above described a
fully future state as of M4/M5.3 and is now partially built: `/review/claims`
and `/review/claims/[claimId]` are real, gated by `public.reviewers` (an
active row, checked live inside PostgreSQL — never inferred from email,
role claims, or client input), not by the general "Future administrator"
role this table otherwise still describes as unbuilt. See
`docs/decisions/0009-reviewer-authorization-table.md` and
`docs/application-information-architecture.md`'s "Reviewer application
structure" for the actual route table and access rule. Every other cell in
the "Future administrator" column remains exactly as unbuilt as this
document originally described — reviewer authorization only covers
identity-claim review, nothing else.

### Why no separate `/auth/callback`

The milestone brief listed both `/auth/callback` and `/auth/confirm`. Only
`/auth/confirm` is implemented. Supabase's current recommended pattern for
password-based auth (both signup confirmation and password recovery) is a
single `verifyOtp({ type, token_hash })` exchange — there is no separate
OAuth-style authorization-code callback to route through, because this
milestone implements no OAuth/social login (explicitly out of scope). A
`/auth/callback` route would have nothing to do and would be dead code. If a
later milestone adds OAuth, that flow uses a `code` exchange
(`exchangeCodeForSession`) and would justify introducing a real
`/auth/callback` at that point — see `src/app/auth/confirm/route.ts` for the
in-code version of this note.

## Supabase clients

Three small, separated utilities, matching Supabase's current `@supabase/ssr`
guidance and avoiding duplicated client-construction logic:

- **`src/lib/supabase/env.ts`** — the only place that reads
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` /
  `NEXT_PUBLIC_SITE_URL`. Throws a clear, actionable error (pointing at
  `.env.example` and `docs/supabase-development.md`) if a required variable
  is missing, instead of failing with an opaque Supabase SDK error later.
- **`src/lib/supabase/client.ts`** — `createBrowserClient`, for Client
  Components only. Uses only the two `NEXT_PUBLIC_*` values above.
- **`src/lib/supabase/server.ts`** — `createServerClient`, for Server
  Components, Server Actions, and Route Handlers. Uses Next.js's
  asynchronous `cookies()` API (`await cookies()`), matching Next.js 15+/16.
  Wraps cookie writes in a try/catch, per Supabase's own guidance, to
  tolerate being called from a Server Component (which cannot write
  cookies) — this is safe only because `src/proxy.ts` refreshes sessions on
  every request.
- **`src/lib/supabase/proxy.ts`** — `updateSession()`, the session-refresh
  helper used by `src/proxy.ts` (see below). Copies refreshed cookies onto
  both the request (so Server Components in the same request see the new
  token) and the response (so the browser gets it).

No client ever references a secret/service-role key — there is none in this
codebase. `src/lib/supabase/server.ts` imports `next/headers`, which Next.js
only resolves in server-only module graphs; a Client Component importing it
(directly or transitively) fails the build rather than silently bundling
server code into the browser. This is the enforcement mechanism for "don't
import server-only utilities into Client Components" — no extra `server-only`
package dependency was added, since Next.js's own module boundary already
provides it.

## Next.js 16 proxy (`src/proxy.ts`)

Next.js 16 renamed `middleware.ts` to `proxy.ts` (exported function `proxy`,
not `middleware`; runs on the Node.js runtime rather than the Edge runtime).
This project only ever had `proxy.ts` — there is no `middleware.ts` to
migrate away from.

`src/proxy.ts` is a thin adapter over two independently testable pieces:

1. **`src/lib/supabase/proxy.ts` (`updateSession`)** — refreshes the
   session via `supabase.auth.getClaims()` (never `getSession()` alone,
   which is not guaranteed to be revalidated) and copies refreshed cookies
   onto the request and response.
2. **`src/lib/auth/route-protection.ts` (`decideProxyAction`)** — a pure
   function with no Next.js/Supabase dependency, unit tested in
   `tests/unit/route-protection.test.ts`:
   - Unauthenticated + path under `/member`, `/account`, or
     `/update-password` → redirect to `/login?returnTo=<sanitized original path>`.
   - Authenticated + path is `/login` or `/register` → redirect to a
     sanitized `returnTo` if present, else `/member`.
   - Everything else → allow.

`src/proxy.ts` copies the refreshed session cookies onto the *redirect*
response too (not just the pass-through response) — otherwise a session
refreshed on the same request that triggers a redirect would be silently
dropped, desyncing browser and server.

**No redirect loops:** `/login` and `/register` are never themselves inside
the protected-path set, and the default authenticated destination (`/member`)
is never inside the auth-only set, so the two redirect rules can't fire
against each other.

**Matcher:** excludes `_next/static`, `_next/image`, `favicon.ico`, and
common static file extensions, so the proxy doesn't run (and doesn't spend a
session-refresh round trip) on asset requests.

**Not the only authorization check.** `src/app/(protected)/layout.tsx`
independently re-verifies the session server-side for every protected page,
via `getClaims()` again. This is deliberate defense in depth — proxy
decisions are necessary but not sufficient; a server-rendered page that
displays or acts on user data must never assume the request already passed
through the proxy correctly.

## Cookie / session behavior

- Session tokens live only in HTTP cookies managed by `@supabase/ssr` —
  nothing touches `localStorage`/`sessionStorage`.
- `getClaims()` (JWT signature verification, either locally via cached JWKS
  or by confirming with the Auth server) is used everywhere an
  authorization decision is made: the proxy, the protected layout, and
  `/member`. `getSession()` is never used for authorization — only
  `getClaims()`/`getUser()`, per Supabase's own current guidance, since a
  session cookie's embedded user object isn't independently revalidated.
- `/account` specifically uses `getUser()` (a network call to the Auth
  server) rather than `getClaims()`, because it needs `created_at` and
  `email_confirmed_at`, which live on the full user record, not the JWT
  claims.

## Cache behavior for authenticated pages

- `src/app/(protected)/layout.tsx` sets `export const dynamic =
  "force-dynamic"` explicitly, on top of the implicit dynamic rendering
  Next.js already applies to any route that calls `cookies()`. This is
  unavoidable and correct — every protected page needs a fresh session
  check on every request.
- **Revised in this review — the header no longer forces the whole app
  dynamic.** The initial build had one `SiteHeader` in the root layout that
  read the session via the server client on every request, so it could show
  "log in / register" vs. the signed-in email + logout — but since the root
  layout wraps every route, that opted the otherwise-static `/` landing
  page (and every other public route) into dynamic rendering too, just to
  render a header. `SiteHeader` was split in two:
  - **`src/components/layout/PublicHeader.tsx`** — fully static, no
    `cookies()`/Supabase call at all, used in the root layout. Always shows
    "Log in"/"Register" links, even to an already-authenticated visitor —
    that's safe rather than stale, since `src/proxy.ts` redirects an
    authenticated visitor away from `/login`/`/register` the instant either
    is clicked.
  - **`src/components/layout/ProtectedNav.tsx`** — shows Member/Account
    links, the signed-in email, and logout. Rendered only inside
    `src/app/(protected)/layout.tsx`, reusing the `getClaims()` result that
    layout already fetches for its own authorization check — no extra
    Supabase call. This layout was already `force-dynamic`, so this adds no
    new dynamic-rendering cost.
  - Net effect: `/`, `/login`, `/register`, `/forgot-password`,
    `/auth/error` no longer need a session check to render their header at
    all. See "Automated tests" for how the production build's static/
    dynamic split was checked.
- `src/lib/supabase/proxy.ts` forwards the `Cache-Control`/`Expires`/`Pragma`
  headers `@supabase/ssr` sets whenever it writes a refreshed session
  cookie, so a CDN/reverse proxy in front of this app (none exists yet —
  see `docs/supabase-development.md`) won't cache one user's session and
  serve it to another.

## Signup confirmation flow

1. `/register` collects email, password, password confirmation, and
   explicit Terms/Privacy acceptance (a plain-text placeholder — no `/terms`
   or `/privacy` routes exist yet; out of scope for this milestone). Client-
   and server-side validation both run (`src/lib/auth/validation.ts`);
   duplicate submission is prevented by `SubmitButton`'s `useFormStatus`-
   driven disabled state.
2. `registerAction` calls `supabase.auth.signUp({ email, password, options:
   { emailRedirectTo } })`. `emailRedirectTo` is set to
   `${NEXT_PUBLIC_SITE_URL}/auth/confirm` — required so Supabase's redirect
   allow-list (`supabase/config.toml`, `additional_redirect_urls`) accepts
   the request, even though the actual post-confirmation destination isn't
   driven by this value (see next point).
3. Supabase emails `supabase/templates/confirmation.html`, a **custom local
   template** (see `supabase/config.toml`,
   `[auth.email.template.confirmation]`) whose link is
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/member` —
   the current Supabase-recommended PKCE-flow pattern for SSR apps, in place
   of GoTrue's built-in implicit-flow link. `next` is **hardcoded in the
   template**, not driven by `{{ .RedirectTo }}`, so it's always a
   same-origin path this app chose — never something derived from
   request-time input.
4. The user clicks the link. `src/app/auth/confirm/route.ts` reads
   `token_hash`/`type`/`next`, calls `supabase.auth.verifyOtp({ type,
   token_hash })`, and on success redirects to `next` (`/member`) with the
   query string stripped from the visible destination. On failure, redirects
   to `/auth/error`.
5. `/register`'s success state is the same neutral "check your email" copy
   regardless of whether the email was new or already registered — see
   "Security decisions" below.

## Password recovery flow

1. `/forgot-password` collects an email address and calls
   `resetPasswordForEmail(email, { redirectTo: '${siteUrl}/auth/confirm' })`
   inside `forgotPasswordAction`. The result (success or error) is
   **discarded** — the action always returns the same success state, so this
   endpoint cannot be used to enumerate accounts.
2. Supabase emails `supabase/templates/recovery.html` (custom local
   template, `[auth.email.template.recovery]`), linking to
   `/auth/confirm?token_hash=...&type=recovery&next=/update-password`.
3. `/auth/confirm` verifies the OTP the same way as the signup flow (it's
   the same endpoint, disambiguated by `type=recovery`) and redirects to
   `/update-password`, with a session now established.
4. `/update-password` (inside the `(protected)` route group) requires that
   session — an unauthenticated visitor is redirected to `/login` by both
   the proxy and the protected layout. `updatePasswordAction` calls
   `supabase.auth.updateUser({ password })`.
5. On success, `updatePasswordAction` clears the recovery-flow hint cookie
   (below) — this keeps the UX marker honest but is not itself what secures
   the password change; see "Password-update authorization" below.

## `/update-password` scope

`/update-password` is **only** *presented as* completing a password reset
started from the recovery email link — it is deliberately **not** designed
or copy-written as a general "change your password while signed in" page.
Voluntary password changes (a logged-in member deciding to change their
password without having forgotten it) are out of this milestone's scope;
that will live at **`/account/security`** once it's built, as its own,
separately-scoped route with its own re-authentication requirements to
decide.

**Security-accuracy correction (post-review).** An earlier version of this
section described the cookie below as gating *access* to `/update-password`
and claimed it stopped a raw POST from invoking the action "outside this
flow." Both claims overstated what an `httpOnly` cookie can guarantee:
`httpOnly` only blocks *browser JavaScript* from reading or setting the
cookie — it does nothing to stop the cookie's own owner (via devtools,
`curl`, or any HTTP client) from setting, forging, or replaying it. The
cookie was never cryptographically signed, so nothing server-side could
have verified it actually originated from a real recovery-link visit. This
section, and the code's own comments (`src/lib/auth/recovery-flow-hint.ts`,
`src/app/(protected)/update-password/page.tsx`,
`src/features/auth/actions/update-password.ts`), were rewritten to state
plainly what the cookie is and isn't.

**What the cookie is: a UX flow marker, not a security control.** Per the
user's explicit preference for the smallest safe design, this milestone
keeps the cookie as an unsigned UX hint rather than building a signed/
verifiable token — this is judged acceptable *because* forging it has a
narrow, low-consequence ceiling: at most, it lets an already-authenticated
visitor reach the password form without having clicked a recovery link,
and all that visitor can ever do with the form is change the password of
the account they are already signed in as (see "Password-update
authorization" below for why). It does **not** let anyone reset a password
they don't already control the session for, and it does **not** prove a
request came from the recovery email.

- `src/app/auth/confirm/route.ts` sets a short-lived, `httpOnly` cookie
  (`netpdbff_recovery_flow_hint`, `src/lib/auth/recovery-flow-hint.ts`,
  10-minute `maxAge`, `sameSite=lax`, `secure` in non-local environments,
  scoped to the `/update-password` path) whenever `type=recovery`
  verification succeeds — immediately before redirecting there. The name
  was deliberately chosen to not imply "token," "signed," "verified," or
  "proof" — see the unit test asserting exactly that,
  `tests/unit/recovery-flow-hint.test.ts`.
- `src/app/(protected)/update-password/page.tsx` checks for that cookie
  *after* `(protected)/layout.tsx` has already independently verified a
  real Supabase session exists — an unauthenticated visitor never reaches
  this check at all, cookie or no cookie. If the cookie is missing, the
  page renders a distinct, clearly-worded **"Reset link required"** state
  instead of the password form. This picks which explanation to show; it
  is not a second authorization gate.
- `updatePasswordAction` (`src/features/auth/actions/update-password.ts`)
  re-checks the same cookie for UX consistency (so a direct POST that
  skips the page gets the same neutral message rather than a confusing
  raw error) — this is explicitly **not** what stops an unauthenticated or
  cross-account request; see "Password-update authorization" below for
  what does.
- On a successful password change, the cookie is cleared. This keeps the
  UX hint honest (a second visit asks for a new link again) but revokes no
  security property, since the cookie never granted one.

**An authenticated user can, in fact, reach `/update-password` without
ever clicking a recovery link**, by visiting the URL directly or by
forging the cookie via devtools. This is a known, accepted, and tested
behavior (`tests/e2e/update-password.spec.ts`, "Password-update
authorization" describe block) — it is equivalent to that user changing
their own password while signed in, which is a legitimate action for an
account owner to take on their own account; it just isn't the polished
"change your password" UX this milestone chose not to build yet. It is
**not** a way to change anyone else's password.

Losing the cookie legitimately (a cleared browser, a different device than
the one the email was opened on, waiting past the 10-minute window) just
re-routes back through "request a new link," which is the same experience
as an expired reset link in most products.

`/account` no longer links to `/update-password` — see its page for the
"coming soon under Account → Security" note.

## Password-update authorization

This is the section "/update-password scope" above points to for what
*actually* secures a password change, independent of the UX hint cookie.
Verified by direct code reading and exercised by
`tests/e2e/update-password.spec.ts`'s "Password-update authorization"
tests:

- **`updateUser` runs against the caller's own Supabase session, and
  nothing else.** `updatePasswordAction`
  (`src/features/auth/actions/update-password.ts`) calls `createClient()`
  (`src/lib/supabase/server.ts`), which builds a Supabase client bound to
  whatever session cookies are present on *this specific request*. It then
  calls `supabase.auth.updateUser({ password })` on that client.
- **No service-role client is used anywhere in this path.** Not in
  `update-password.ts`, not in `src/lib/supabase/server.ts`. Every write
  runs as the requesting user, subject to Supabase Auth's own rules — this
  matches the "no service-role key in application code" rule in
  `CLAUDE.md`.
- **No user ID is ever accepted from the form or request.** `updateUser`
  takes only `{ password }` — there is no parameter, hidden field, or
  cookie value anywhere in this flow that names *whose* password to
  change. The account changed is always, structurally, "whoever this
  session belongs to."
- **A user can only ever change their own session's password.** A direct
  consequence of the two points above — there is no code path in this
  action that could target a different account, forged cookie or not.
- **An unauthenticated request fails, even with a forged recovery-flow
  hint cookie present.** If there's no valid Supabase session, the
  Supabase client `createClient()` builds has no access token to
  authenticate the write with, so `updateUser` itself returns an error
  (mapped to safe copy by `toSafeAuthErrorMessage`). Separately,
  `src/app/(protected)/layout.tsx` redirects an unauthenticated visitor to
  `/login` before the page (and therefore the form that would `POST` to
  this action) ever renders — so in practice an unauthenticated caller is
  stopped twice, once by the layout and, even if that were somehow
  bypassed, again by `updateUser` itself.

Tested by `tests/e2e/update-password.spec.ts`, `describe("Password-update
authorization")`:

- *Missing session, forged cookie present* — a browser context with no
  login at all, carrying a forged `netpdbff_recovery_flow_hint` cookie,
  visiting `/update-password` is redirected to
  `/login?returnTo=%2Fupdate-password` — the layout's session check, not
  the cookie, decides this.
- *Authenticated session, forged cookie* — a normally-registered-and-
  confirmed account (never touching the real recovery flow) that forges
  the hint cookie does reach the password form, and submitting it changes
  that same account's password only, confirmed by logging back in with
  the new password on the same account.

No test exercises "change a *different* account's password with a forged
cookie," because no code path exists that takes an account identifier from
anywhere other than the session itself — there is nothing to forge that
would reach a different account.

## Validation approach

No validation library was added. `src/lib/auth/validation.ts` is a set of
small, pure, synchronous functions (email format, password strength,
confirmation matching, terms acceptance, `returnTo` sanitization) —
unit-tested directly in `tests/unit/validation.test.ts` with no framework
dependency. This repository has very few dependencies by design (see
`CLAUDE.md`, "do not add dependencies without explaining their purpose"), and
these forms (four fields at most) don't need a schema library or a form
framework like React Hook Form/Formik. If a future milestone introduces
substantially more complex forms, revisit this decision — but don't
introduce a library speculatively now.

### Password policy

Centralized in a single module, `src/lib/auth/password-policy.ts`
(`PASSWORD_POLICY`): minimum length 8, must include at least one letter and
one digit, capped at 72 characters (GoTrue/bcrypt only considers the first
72 bytes of a password and silently truncates beyond that — rejected
outright instead, which is less confusing). Both server-side validation
(`validatePassword` in `src/lib/auth/validation.ts`) and every form's hint
text (`PASSWORD_POLICY_HINT`, used by both `RegisterForm` and
`UpdatePasswordForm`) read from this one module, so the UI can't promise a
rule the server doesn't enforce, or vice versa — see
`tests/unit/password-policy.test.ts`.

**This is now an exact match with `supabase/config.toml`, not just a
stricter superset of it.** The initial version of this milestone set
`minimum_password_length = 8` to match the app, but left
`password_requirements = ""` (Supabase's CLI default — no character-class
requirement at all), meaning Supabase Auth itself would have accepted an
all-letters or all-digits password that this app's own UI claimed wasn't
allowed. The quality review that added this section changed
`password_requirements` to `"letters_digits"` — GoTrue's own built-in rule
requiring "at least one letter and one number," which is exactly this app's
rule. There is nothing to keep `maxLength` in sync with, since Supabase
doesn't expose a configurable maximum — that cap is this app's own,
UX-only safety rail. Both `config.toml` and `password-policy.ts` carry
comments pointing at each other; keep them in sync by hand if either
changes.

## Security decisions

- **Server-side validation on every action.** Every Server Action
  (`src/features/auth/actions/*.ts`) re-validates input with
  `src/lib/auth/validation.ts` — client-side validation is a UX convenience,
  never the enforcement point.
- **Safe redirects only.** `sanitizeReturnTo()` accepts only same-origin
  relative paths (must start with exactly one `/`, no `//`, no `\`, no
  embedded `://`, restricted character set) — this is the sole defense
  against open-redirect via the `returnTo`/`next` query parameters used by
  `/login` and `/auth/confirm`. It's applied independently in three places
  (the proxy's route-protection logic, the login Server Action, and the
  confirm Route Handler) — each caller re-sanitizes rather than trusting a
  value that already passed through another layer.
- **No service-role key anywhere in this codebase.** Every Supabase call in
  this milestone runs as the current user (or anonymous), subject to Row
  Level Security.
- **No secrets in `NEXT_PUBLIC_*` variables.** `.env.example` (unchanged by
  this milestone) already documents this; nothing added here changes it.
- **Nothing sensitive is logged.** No Server Action logs `error`, `data`, or
  any raw Supabase response — passwords, access tokens, and refresh tokens
  never reach `console.*` or any other sink. Error messages shown to the
  client are always passed through `src/lib/auth/errors.ts`
  (`toSafeAuthErrorMessage`), which maps a small allow-list of known,
  non-identity-revealing Supabase error strings to stable copy and falls
  back to one generic message for everything else.
- **No authorization based solely on client-supplied state.** Route
  protection and page rendering both derive authentication status from
  `getClaims()`/`getUser()` — JWT-signature-verified or server-confirmed —
  never from a client-set flag, header, or unvalidated cookie value.
- **Session verification on every protected server-rendered page,**
  independent of the proxy — see `src/app/(protected)/layout.tsx` above.
- **Generic responses for registration and password-reset requests.**
  Covered above under each flow; this is the specific enumeration
  protection the brief called out by name.
- **Query-parameter disclosure.** `/auth/confirm` strips its entire query
  string (`token_hash`, `type`, `next`) from the redirect target before
  sending the user on, so a used-once token doesn't linger in the visible
  URL, browser history, or a subsequent page's referrer.
- **No custom password hashing.** Supabase Auth (GoTrue, bcrypt) owns
  credential storage end to end; nothing in this codebase touches a
  password except to pass it to `supabase.auth.signUp` / `signInWithPassword`
  / `updateUser`.

## Neutral resend-confirmation flow

A user who registered but lost or never received the confirmation email
needs a way to ask for another one — without that request becoming a way to
check whether an email address is registered. `resendConfirmationAction`
(`src/features/auth/actions/resend-confirmation.ts`) calls
`supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo }
})` and **discards the result** exactly like `forgotPasswordAction` does —
the same success state is returned whether the address is unregistered,
already confirmed, or genuinely pending confirmation.

`src/components/auth/ResendConfirmationForm.tsx` (a Client Component) is
embedded in two places:

- **`/register`'s post-submit success state**, passing the just-submitted
  email as a hidden field (no need to ask again).
- **`/login`**, inside a collapsed `<details>` disclosure ("Didn't get a
  confirmation email?"), with its own email field — this is what makes
  login's tightened error mapping (see "Account-enumeration review") not a
  dead end for a legitimately unconfirmed user.

**Cooldown, not just a pending state.** `SubmitButton` already prevents a
double-click mid-request (`useFormStatus`), but that alone doesn't stop
someone clicking "resend" five times in five seconds once each request
completes — which would burn through Supabase's local
`[auth.rate_limit] email_sent` budget fast and, on a hosted project, could
look like abuse. `ResendConfirmationForm` swaps the submit button for a
disabled `CooldownButton` for 30 seconds after each successful submission.
`CooldownButton` counts down via its own `setInterval`, entirely
self-contained (its local `remaining` state is only ever set from its own
timer callback, never mirrored from a sibling's state), and is remounted
fresh — via a React `key` derived from a `nonce` the server action returns
on each success — if the user resends again after a cooldown has already
run out. This shape was chosen specifically to avoid the two
React-Compiler-oriented ESLint rules (`react-hooks/set-state-in-effect`,
`react-hooks/refs`) this repository's `eslint-config-next` enables, which
reject both "sync one state from another inside a bare effect" and "mutate
a ref during render" — the two more obvious ways to implement this same
cooldown. This is a UX throttle, not a security control by itself —
Supabase's own rate limit is still the real backstop, since a client-side
cooldown is trivially bypassable by anyone not using the browser UI.

## Account-enumeration review

An explicit pass over every flow that takes an email address as input,
checking whether its *response* (not just its data) reveals whether that
address belongs to a registered account:

| Flow | Response on success | Response on failure/nonexistence | Enumeration-safe? |
|---|---|---|---|
| Registration | Neutral "check your email" | Same neutral message (only weak-password/rate-limit errors differ, and those aren't about the address) | Yes — unchanged from the initial build |
| Login | Redirect to the destination | "Invalid email or password." | Yes, **after this review** — see below |
| Forgot password | Neutral "if an account exists…" | Same neutral message (result discarded) | Yes — unchanged from the initial build |
| Resend confirmation | Neutral "if that address is registered and not yet confirmed…" | Same neutral message (result discarded) | Yes — new in this review |

**What changed: login's "email not confirmed" case.** Supabase returns a
distinguishable error for signing in to an unconfirmed account, separate
from wrong credentials. The initial build surfaced that distinction
("please confirm your email address before logging in") because it's
genuinely useful to a legitimate user — but it also means a login attempt
*alone*, without even needing the correct password, could confirm whether
an address is registered. `src/lib/auth/errors.ts` now maps both
`invalid login credentials` and `email not confirmed` to the identical
string, `"Invalid email or password."` — see the comment there for the
full reasoning. The usefulness this removes is restored through a
different, non-revealing channel: the `/login` page always shows a
"Didn't get a confirmation email?" resend option, regardless of whether an
error is currently displayed — so a legitimate unconfirmed user still has
a path forward, but that path isn't gated behind an error message that
would otherwise leak account existence.

**Kept deliberately un-generic:** field-level format validation ("Enter a
valid email address.") on every form. This reveals nothing about account
existence — it's purely about the shape of the input — and collapsing it
into a generic message would make every form needlessly harder to use.

## User-facing states

Six explicit states, per the milestone review, and where each lives:

| State | Where | Trigger |
|---|---|---|
| Confirmation email sent | `RegisterForm` success view | `registerAction` returns `{ status: "success" }` |
| Confirmation success | `/member` banner | Landed via `/auth/confirm?confirmed=1` (set only after a verified `type=email` exchange) |
| Invalid or expired confirmation | `/auth/error` | `/auth/confirm` failed to verify the token (any type) |
| Password-reset request submitted | `ForgotPasswordForm` success view | `forgotPasswordAction` returns `{ status: "success" }` (always, regardless of outcome) |
| Password-update success | `UpdatePasswordForm` success view | `updatePasswordAction` returns `{ status: "success" }`, with a link onward to `/member` |
| Expired session | `/login` banner | Arrived at `/login` with a `returnTo` query parameter — i.e. sent here by the proxy or the protected layout, not by clicking "Log in" directly |

The "expired session" state deliberately hedges its wording ("your session
*may have* expired") rather than asserting it, since a `returnTo` also
appears for a visitor who was never signed in and simply followed a link to
a protected route — there's no reliable way to distinguish the two cases
from a missing/invalid cookie alone, and asserting the wrong one would be
actively misleading.

## Environment variables

No new variables were required beyond what `.env.example` already
documented in M3 (`docs/supabase-development.md`):

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `src/lib/supabase/env.ts` (`getSiteUrl`) — builds the `emailRedirectTo`/`redirectTo` values passed to Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server Supabase clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server Supabase clients |

`src/lib/supabase/env.ts` throws immediately, with a message pointing at
`.env.example`/`docs/supabase-development.md`, if any of these is missing —
rather than letting a Supabase SDK call fail later with a less useful error.

## Local Supabase configuration changes

`supabase/config.toml` (all comments in the file itself explain why):

- `[auth] site_url` changed from `http://127.0.0.1:3000` to
  `http://localhost:3000`, matching `NEXT_PUBLIC_SITE_URL` in `.env.example`.
- `[auth] additional_redirect_urls` widened to `["http://localhost:3000/**",
  "http://127.0.0.1:3000/**"]` so both hostnames work and every callback
  path under each host is covered.
- `[auth] minimum_password_length` raised from 6 to 8, and
  `[auth] password_requirements` set to `"letters_digits"` (was `""`) —
  see "Password policy".
- `[auth.email] enable_confirmations` changed from `false` (the CLI
  default) to `true` — required for the signup-confirmation flow this
  milestone implements to be exercisable locally at all.
- `[auth.rate_limit] email_sent` raised from 2/hour to 30/hour — the CLI
  default of 2 would make it impossible to run the registration and
  password-reset flows more than once or twice per hour, including via the
  Playwright suite. Local-only; has no effect on a hosted project.
- Added `[auth.email.template.confirmation]` and
  `[auth.email.template.recovery]`, pointing at
  `supabase/templates/confirmation.html`/`recovery.html` — see "Signup
  confirmation flow" for why these were customized.

## Local Mailpit testing

Prerequisites: Docker running, local Supabase stack started.

```bash
npm install
npm run supabase:start
npm run supabase:status   # confirm local URLs — API, DB, Studio, and Mailpit ports
npm run dev
```

`supabase status` prints the local Mailpit URL (CLI default:
`http://127.0.0.1:54324`) — open it in a browser to see every email the
local stack sends.

1. **Registration** — go to `/register`, submit a new email/password/terms
   acceptance. You should land on the neutral "check your email" state,
   with a "Resend confirmation email" control below it.
2. **Confirmation email in Mailpit** — open the Mailpit URL; a message from
   "Confirm your NetPDBFF account" should appear addressed to that email.
3. **Resend confirmation** — before clicking the link, go back to the app
   and click "Resend confirmation email." A second message should appear
   in Mailpit, and the button should become disabled with a countdown
   ("Resend available in Ns") for about 30 seconds.
4. **Confirmation callback + confirmation success** — click the link in
   the (first or second) email. You should land on `/member`, signed in,
   with a "Your email address has been confirmed" banner, your email shown
   in the page, and the ProtectedNav bar (Member/Account/email/Log out)
   above it.
5. **Logout** — click "Log out" (from ProtectedNav, visible on `/member` or
   `/account`). You should land on `/login`, and visiting `/member` again
   should redirect you back to `/login`.
6. **Expired-session state** — immediately after that redirect, `/login`
   should show "Please log in to continue. If you were signed in before,
   your session may have expired." above the form (because you arrived via
   `returnTo`, not by clicking "Log in" directly).
7. **Login** — log back in at `/login` with the same credentials; you
   should land on `/member` (or wherever `returnTo` pointed), and the
   expired-session banner should be gone (this time you clicked "Log in"
   directly, with no `returnTo`).
8. **Password-reset email** — go to `/forgot-password`, submit the same
   email. You should see the same neutral response regardless of whether
   the address is registered.
9. **Recovery callback** — open the "Reset your NetPDBFF password" message
   in Mailpit and click its link. You should land on `/update-password`,
   already signed in, showing the password form (not the "reset link
   required" state).
10. **`/update-password` without the recovery-flow hint** — while still
    logged in, open `/update-password` again in a new tab with no cookies
    cleared (simulating "just typed the URL"): if you complete step 9's
    flow first and the hint cookie already expired/was consumed, or if you
    visit `/update-password` on a separate, freshly-authenticated session,
    you should see the "Reset link required" state, not the password form.
    (This is a UX state, not a security boundary — see "/update-password
    scope.")
11. **Password update** — (back in the tab that came from the recovery
    link) submit a new password; you should see a clear success state
    linking to `/member`, and be able to log in with the new password
    afterward. Revisiting `/update-password` right after should now show
    "Reset link required" again (the cookie was consumed on success).
12. **Protected-route redirects** — while logged out, visit `/member`,
    `/account`, and `/update-password` directly; each should redirect to
    `/login?returnTo=<that path>` with the expired-session banner showing.
    While logged in, visit `/login` or `/register` directly; each should
    redirect to `/member`.
13. **Enumeration spot-check** — try steps 1 and 8 with an email you know
    isn't registered, and again with one that is. The responses should
    read identically in both cases. Try logging in with a real,
    registered-but-unconfirmed account's email and a wrong password, and
    separately with a made-up email — both should show the same "Invalid
    email or password."

Local Supabase's default SMTP rate limit was raised to 30 emails/hour for
this milestone specifically so steps 1–8 can be repeated without waiting —
see "Local Supabase configuration changes". **Production SMTP is not
configured** — see "What remains" below.

## Test-toolchain dependency upgrade (Vitest 2 → 4)

**What changed and why.** A local `npm audit` (run outside this authoring
sandbox, which cannot reach the npm registry — see below) flagged
`esbuild <= 0.24.2` as vulnerable, reached only through the dev-only chain
`vitest@2.1.9 → vite@5.4.21 → esbuild@0.21.5` (confirmed via `npm explain
esbuild`, reproduced below). This is a **test-toolchain-only** vulnerability
— `esbuild`/`vite`/`vite-node`/`@vitest/mocker` are transitive
`devDependencies` pulled in solely by `vitest`; none of them are declared
dependencies, none ship in `next build`'s production output, and the
application itself doesn't import Vite or esbuild directly. `npm audit fix
--force` was **deliberately not run** — it would have jumped straight to
whatever `vitest` major it resolves without a reviewed migration pass,
which is exactly the "upgrade blind" failure mode this correction avoids.

```
npm explain esbuild
  esbuild@0.21.5 dev
  node_modules/esbuild
    esbuild@"^0.21.3" from vite@5.4.21
      vite@"^5.0.0" from vitest@2.1.9
      vite@"^5.0.0" from vite-node@2.1.9
      peerOptional vite@"^5.0.0" from @vitest/mocker@2.1.9
```

**Fix: `vitest` bumped from `^2.1.8` to `^4.1.10`** (`package.json`),
the newest stable 4.x release as of this review. Vitest 4 requires Vite
&ge; 6 and Node.js &ge; 20 (this repo's sandbox runs Node 22; confirm the
same locally with `node -v`) — bumping `vitest` alone is sufficient for
`npm` to resolve compatible, newer `vite`/`vite-node`/`@vitest/mocker`/
`esbuild` versions as transitive devDependencies; none of those four
packages are pinned directly in `package.json`, so none needed a manual
version edit, and no `overrides` entry was added, since there is no
genuine unresolved version conflict — just an outdated transitive chain
that a single root-level bump resolves.

**Vitest 3→4 migration review.** This project's `vitest.config.ts` is
minimal (`test.include`, `test.environment: "node"` — no coverage,
workspace/`projects`, custom pool, or browser-mode config), and every
`tests/unit/*.test.ts` file uses only plain `describe`/`it`/`expect` (and,
in `recovery-flow-hint.test.ts`, `beforeEach`/`afterEach` mutating
`process.env`) imported explicitly from `"vitest"` — no `vi.fn`/
`vi.spyOn`/module mocking, no third-argument test-options object, no
custom snapshot serializers, no reliance on the default `test.exclude`
list beyond this project's own explicit `include`. Cross-checked against
the official [Vitest 4.0 migration guide](https://vitest.dev/guide/migration.html):
none of its breaking changes (V8 coverage remapping, removed
`coverage.all`/`coverage.extensions`, simplified default `exclude`, spy/
mock construction changes, `vite-node` → Module Runner, `workspace` →
`projects`, browser-provider rework, pool-option renames, reporter API
removals, snapshot shadow-root printing, removed deprecated options)
apply to this repository's configuration or tests. **Conclusion: no
source-level migration changes were required** — the fix is the version
bump alone. `vitest.config.ts` and every file under `tests/unit/` are
unchanged in this pass.

**Environment limitation: `npm install` could not be executed in this
authoring sandbox.** Unlike the earlier, narrower blocker documented below
(a single missing native binary), this sandbox's outbound network proxy
enforces a domain allowlist that rejects every package registry tested —
confirmed via `curl -v`, which shows the proxy itself, not npm, refusing
the connection:

```
$ curl -sv https://registry.npmjs.org/vitest
< HTTP/1.1 403 Forbidden
< X-Proxy-Error: blocked-by-allowlist
```

The same `blocked-by-allowlist` response was returned for
`registry.npmjs.org`, `registry.npmmirror.com`, `unpkg.com`,
`cdn.jsdelivr.net`, and (for unrelated verification) `github.com` — this
is a categorical block on package-registry traffic in this sandbox, not
an intermittent rate limit, and not specific to `vitest`. As a result:

- `package.json` now declares `"vitest": "^4.1.10"`, but
  `package-lock.json` and `node_modules` in this sandbox still reflect the
  previously-installed `2.1.9` tree (confirmed by `npm ls`, which reports
  `vitest@2.1.9 invalid: "^4.1.10" from the root project` — this is the
  expected, correct state for a manifest change that hasn't been installed
  yet, not a corrupted lockfile).
- `package-lock.json` was **not** hand-edited to reflect the intended
  4.x tree. Fabricating lockfile entries (resolved sub-dependency
  versions, integrity hashes) without the registry access needed to
  verify them would risk installing a silently wrong or inconsistent
  dependency tree — worse than leaving the lockfile in its current,
  honestly-stale state pending a real `npm install`.
- `npm run typecheck` and `npm run lint` were re-run after the
  `package.json` edit and are unaffected (both pass) — `tests/` and
  `vitest.config.ts` are excluded from both (see `tsconfig.json`,
  `eslint.config.mjs`), so a devDependency version mismatch in
  `node_modules` can't surface there.
- `npm run test`, `npm audit`, and `npm audit --omit=dev` were **not**
  run against the mismatched pre-upgrade `node_modules` in this pass,
  since a `vitest run` right now would just exercise the *old* 2.1.9
  binary under a `package.json` that already claims 4.1.10 — a
  misleading result either way. `npm audit` itself additionally fails
  outright in this sandbox regardless of any vitest version, since its
  `POST https://registry.npmjs.org/-/npm/v1/security/audits/quick` call
  hits the same allowlist block.

**Required next step, local machine only:**

```bash
npm install                                          # resolves vitest@4.x + updated vite/vite-node/@vitest/mocker/esbuild, rewrites package-lock.json
npm ls vitest vite vite-node esbuild @vitest/mocker   # confirm the new resolved tree, no "invalid"/extraneous entries
npm run test                                          # expect 50/50 unit cases passing under vitest run
npm run lint
npm run typecheck
npm run build
npm audit
npm audit --omit=dev
```

If `npm ls` shows a genuine unresolved peer conflict after a real install
(unlikely, given `vite`/`vite-node`/`@vitest/mocker` are all resolved
transitively from `vitest` alone with nothing else in this repo depending
on a specific `vite` major), that would be the one legitimate case for
adding a narrowly-scoped `overrides` entry — but that decision needs the
actual resolved tree from a working `npm install` to make correctly, not
a guess made without registry access.

## Automated tests

**Rewritten in M5.5.** This section originally (M4-era) described every
suite as "authored but never executed," because the sandbox that milestone
was written in had no Docker and no npm-registry access. That framing is
now obsolete — every suite below has since been run locally, on a real
machine with Docker and registry access, repeatedly across M4 through
M5.5, and is confirmed passing at current `HEAD`. This section states the
real, current composition and the latest confirmed counts rather than the
old authored/executed/pending three-way split, which no longer describes
this project's actual state.

### Unit tests (Vitest)

`tests/unit/` (top-level auth/identity/review/navigation/theme logic) plus
`tests/unit/components/` (component-level tests using Testing Library, per
M5.1):

| File | Cases | Covers |
|---|---|---|
| `validation.test.ts` | 22 | email/password/registration/login validation, `sanitizeReturnTo` |
| `route-protection.test.ts` | 9 | `decideProxyAction` |
| `identity-derive-status.test.ts` | 9 | Claim-status derivation (M5.3) |
| `identity-validation.test.ts` | 8 | Claim-submission input validation (M5.3) |
| `navigation-active.test.ts` | 8 | `isNavItemActive` (M5.2) |
| `recovery-flow-hint.test.ts` | 8 | Cookie attributes only (`httpOnly`, `sameSite`, `path`, `maxAge`, `secure`) — deliberately does not and cannot test "is this forgeable," since it is, by design; see "/update-password scope" |
| `theme-parse.test.ts` | 10 | Stored-theme-preference parsing (M5.1) |
| `review-validation.test.ts` | 9 | Reviewer decision-input validation (M5.4) |
| `password-policy.test.ts` | 6 | `PASSWORD_POLICY`/`PASSWORD_POLICY_HINT` agreement with `validatePassword` and `supabase/config.toml` |
| `navigation-config.test.ts` | 6 | `navigationConfig` shape/consistency (M5.2) |
| `theme-inline-script.test.ts` | 7 | The anti-FOUC inline script's generated output (M5.1) |
| `errors.test.ts` | 5 | `toSafeAuthErrorMessage`, including the enumeration-safety mapping |
| `identity-copy.test.ts` | 5 | Claim-status-to-copy mapping (M5.3) |
| `review-copy.test.ts` | 5 | Reviewer-facing status copy (M5.4) |
| `dev-only-route.test.ts` | 5 | `/dev/design-system` production-exclusion behavior (M5.1) |
| `navigation-select.test.ts` | 4 | `getNavItemsByGroup` (M5.2) |
| `review-types.test.ts` | 4 | Reviewer status-transition/action-availability logic (M5.4) |
| `review-authorization.test.ts` | 3 | `am_i_a_reviewer()`-wrapping authorization state mapping (M5.4) |
| `components/Switch.test.tsx` | 13 | `Switch` primitive (M5.1) |
| `components/FormField.test.tsx` | 7 | `FormField` (M4, extended M5.1) |
| `components/Dialog.test.tsx` | 6 | `Dialog` primitive (M5.1) |
| `components/Button.test.tsx` | 5 | `Button` primitive (M5.1) |
| `components/SkipLink.test.tsx` | 2 | `SkipLink` (M5.2) |
| **Total** | **166** | |

**Executed and passing: 166/166**, confirmed at the current baseline
(`8e40e43`, M5.4 complete) prior to M5.5, and unaffected by M5.5 (no
Vitest-covered source changed in this milestone beyond the two globals.css
token values described in the M5.5 completion report — pure CSS, not
exercised by any Vitest case). Run:

```bash
npm run test          # vitest run
npm run test:watch    # vitest, watch mode
```

`npm run typecheck`/`npm run lint` remain unaffected by anything in
`tests/`: `tests/` and the two test config files (`vitest.config.ts`,
`playwright.config.ts`) are excluded from the root `tsconfig.json` and
from ESLint (see those files and `eslint.config.mjs`'s `globalIgnores`).

### End-to-end tests (Playwright)

`tests/e2e/`:

| File | Cases (executed) | Covers |
|---|---|---|
| `auth-pages-quality.spec.ts` | 28 | Console/hydration errors, duplicate ids, horizontal overflow, heading/action presence across `/login`/`/register`/`/forgot-password`/`/auth/error` in both themes; `/update-password`'s gated state in both themes; keyboard-visible focus; two markup regressions (M5.2) |
| `claim-review.spec.ts` | 9 | Reviewer access control, queue/detail/evidence scoping, self-review denial, immediate revocation, approve/reject workflows and their claimant-visible outcomes, browser quality in both themes (M5.4) |
| `accessibility.spec.ts` | 23 | Automated axe-core WCAG 2.1 AA scan (M5.5, item 10) — see below |
| `update-password.spec.ts` | 5 | 3 scope tests ("Reset link required" state, `/account` no longer linking here, one-time access via the real recovery link) + 2 authorization tests (forged cookie without a session redirects to `/login`; forged cookie with a session can only change that same session's own password) |
| `protected-routes.spec.ts` | 6 | Unauthenticated visitor redirected from `/member`, `/account`, `/update-password`, `/member/claim`, `/review/claims` with the expired-session banner; no banner visiting `/login` directly |
| `workspace-pages-quality.spec.ts` | 8 | Console/hydration errors, duplicate ids, horizontal overflow across `/member`/`/account`/`/member/claim` in both themes; accessible structure and honest-empty-state assertions on `/member` and `/account` (M5.2/M5.3) |
| `login.spec.ts` | 5 | Field validation, generic invalid-credentials error, the same generic error for an unconfirmed account, the always-present resend-confirmation disclosure, logout |
| `claim-workflow.spec.ts` | 4 | Claim discovery/search, no-match state, focus management, submission/status/duplicate-prevention/withdrawal (M5.3) |
| `register.spec.ts` | 4 | Field validation, terms-acceptance requirement, full register → Mailpit → confirm → `/member` flow with the `?confirmed=1` banner, resend-confirmation with a visible cooldown |
| `password-reset.spec.ts` | 3 | Identical neutral response for an unregistered vs. registered address; malformed-input rejection |
| **Total** | **95** | |

**Executed and passing: 72/72 confirmed at the pre-M5.5 baseline
(`8e40e43`)**, covering every file above except `accessibility.spec.ts`.
**`accessibility.spec.ts` is new in M5.5** — 23 cases, authored and
statically reviewed against the actual redesigned markup and the app's own
design tokens (see the M5.5 completion report for the direct WCAG
contrast-ratio calculation that found and fixed a real `--color-subtle-
foreground` gap), but this environment cannot run the local Supabase stack
(no Docker, no `linux-arm64` `supabase` CLI binary) or install
`@axe-core/playwright` (npm-registry access blocked here) to actually
execute it. **Still requires local execution**, the same category this
document used for the entire suite before M4's own sandbox limitation was
resolved:

```bash
npm install                        # picks up @axe-core/playwright, added in M5.5
npx playwright install chromium    # first run only
npm run supabase:start
npm run test:e2e
```

Once run, the suite total becomes 95/95 if `accessibility.spec.ts` passes
cleanly, or fewer if it surfaces a real violation this static review
missed — see the M5.5 completion report for exactly what to do in that
case (fix the application defect; do not weaken the scan).

They read Mailpit's REST API directly (`tests/e2e/helpers/mailpit.ts`)
rather than using any service-role Admin API call, keeping test setup
within the same constraints as the application code (no service-role
operations — see CLAUDE.md's scope discipline and this milestone's explicit
"do not implement" list).

**M5.4 exception, deliberate and documented, reused by M5.5.**
`tests/e2e/helpers/reviewer.ts` (added in M5.4) uses a service-role
Supabase client — the one exception to the "no service-role operations in
test setup" rule above. This is not the same shortcut that rule otherwise
avoids: there, a service-role call would have bypassed a boundary the
*application* itself also has a legitimate way around (reading Mailpit).
Here, there is no application-reachable alternative to reach at all — per
`docs/decisions/0009-reviewer-authorization-table.md`, granting reviewer
status has no client-facing path in the real system either; only a
trusted service-role connection can do it, by design. The test helper
plays exactly that role for setup, the same way
`supabase/tests/database/claim_review.test.sql`'s pgTAP fixtures insert
`reviewers` rows directly as the table owner — it never bypasses an
authorization check the application code itself would have enforced.
`accessibility.spec.ts`'s reviewer-route coverage (M5.5) reuses this exact
helper rather than introducing a second way to construct a reviewer
session.

**The local service-role key, and how Playwright receives it (M5.5).**
`getServiceRoleClient()` in `tests/e2e/helpers/reviewer.ts` reads
`process.env.SUPABASE_SERVICE_ROLE_KEY` and throws a clear, actionable
error if it's unset — it never falls back to the anon/publishable key and
never silently skips the tests that need it. The value itself comes from
the local Supabase stack (`npm run supabase:status`, "service_role key")
and belongs in `.env.local` — already `.gitignore`d, never committed, and
documented as the sanctioned place for a real secret value in
`docs/supabase-development.md`'s "Credentials that must never be
committed." `playwright.config.ts` loads `.env.local` into `process.env`
via Node's built-in `process.loadEnvFile()` before the test run starts (a
guarded call, `existsSync(".env.local")` first, so an environment that
injects the variable directly — e.g. a future CI configuration — isn't
broken by a missing file); a value already exported in the calling shell
still takes precedence. The key is read only inside this Node test-runner
process, is never referenced from any browser/Client Component code, is
never `NEXT_PUBLIC_`-prefixed, and no client-facing grant/revoke endpoint
exists anywhere in the application as an alternative to it — per
ADR-0009, that absence is deliberate, not a gap this test setup works
around.

## Future security work (documented, not implemented)

Four items the review asked to document without building — none of these
exist in the codebase; this section is a plan, not a status report.

- **Application-level rate limiting.** Today, the only throttling is
  Supabase Auth's own (`supabase/config.toml`, `[auth.rate_limit]`) plus
  `ResendConfirmationForm`'s client-side cooldown (a UX nicety, not a
  control anyone should rely on for safety). Neither stops, say, a scripted
  loop of login attempts against a single account from a single IP faster
  than Supabase's own per-project limits allow, or a distributed attempt
  spread across many IPs. A real answer would live server-side, keyed on
  something more specific than "requests per IP" (e.g. attempts per
  account-plus-IP, with backoff), and would need its own storage — the
  existing `audit_logs` table (next bullet) is a natural place to derive it
  from, rather than inventing a second tracking mechanism.
- **Email-change safeguards.** This milestone never lets a user change the
  email on their account — there's no "update email" UI at all yet, so
  there's nothing to safeguard *today*. When that's built, it needs: 1)
  confirmation on both the old and new address before the change takes
  effect (`supabase/config.toml` already has
  `[auth.email] double_confirm_changes = true`, which enables exactly this
  at the Supabase layer — it's just unused, since no UI calls
  `updateUser({ email })` yet); 2) a decision about whether an email change
  should force re-authentication first, the same open question
  `/update-password` vs. `/account/security` raises for passwords; and 3) a
  notification to the *old* address when a change is initiated, independent
  of Supabase's own confirmation emails, so an account takeover attempt is
  visible to the legitimate owner even if they can't intercept the new
  address's inbox.
- **Application-level auth audit events.** `audit_logs`
  (`docs/database-implementation.md`) already exists in the database —
  append-only, `service_role`-only, built in M3.1 — but nothing in this
  milestone writes to it. No Server Action here (`register`, `login`,
  `logout`, `forgot-password`, `resend-confirmation`, `update-password`)
  records anything beyond what Supabase's own GoTrue logs internally
  (which this app has no access to locally). A future pass should decide
  which of these events belong in `audit_logs` (login failures and password
  changes are the obvious candidates; registration and routine logins are
  a judgment call given the volume) and route them through
  `service_role`-backed server code, consistent with the "no
  service-role in application code" rule this milestone itself follows —
  meaning that code would need to be a deliberately scoped exception, not a
  general capability.
- **The distinction between "authenticated account" and "verified NetPDBFF
  identity."** This is the central boundary
  `docs/decisions/0001-separate-people-from-user-accounts.md` establishes
  and this whole milestone is built around, but it's worth stating plainly
  here since claiming isn't implemented yet: having a working `auth.users`
  row (everything this milestone provides — you can register, log in, and
  reach `/member`) says nothing about *who* a person is. `/member`'s own
  copy already says this to the user. It becomes a "verified NetPDBFF
  identity" only once a `profile_claims` request for a specific `people`
  row is submitted and administrator-approved, producing an active
  `user_person_links` row — a process this milestone deliberately doesn't
  build any part of. Every future feature that shows or acts on
  participant data needs to check for that link, not just for a session —
  the route-access matrix above's "Future linked member" column is what
  that check gates.

## Known limitations

- **No profile claiming.** An authenticated account has no path to become
  associated with a `people` row yet — by design, deferred to a later
  milestone (see `docs/decisions/0001-separate-people-from-user-accounts.md`).
- **The recovery-flow hint cookie is an unsigned UX marker, not a security
  control.** See "`/update-password` scope" and "Password-update
  authorization" — it's scoped, short-lived, and `httpOnly`, but `httpOnly`
  only blocks browser JavaScript, not the cookie's own owner; it is
  trivially forgeable and is never consulted for authorization. Its
  absence just re-routes to "request a new link" rather than representing
  an actual security failure if it's lost legitimately (a cleared browser,
  a different device). An authenticated user can reach `/update-password`
  without it, by design — the real boundary is `updateUser()`'s own
  session requirement, which limits any such visit to changing that same
  user's own password.
- **No account-lockout/anomaly detection beyond Supabase Auth's own rate
  limiting** (`supabase/config.toml`, `[auth.rate_limit]`) — see "Future
  security work" above.
- **Terms/Privacy are placeholder text, not real documents or routes** — no
  `/terms` or `/privacy` page exists; the registration checkbox says so
  explicitly.

## What remains (deferred, out of this milestone's scope)

Per the brief's explicit "do not implement" list — not gaps, deliberate
deferrals:

- Editable personal profiles.
- Person creation during signup, automatic profile claims, or administrator
  claim review — the entire claiming workflow.
- Institutions or PDBFF participation data.
- Social/OAuth login (would justify a real `/auth/callback` — see above).
- Multi-factor authentication.
- Any service-role operation in application code (test helpers included —
  see "End-to-end tests").
- Hosted/production deployment of any kind.
- Changes to the approved M3.1 identity migration.
- A full visual design system (forms use the same restrained, minimal
  styling as the existing landing page — no new component library).
- **`/account/security`** — the future home for voluntary password changes
  (and, eventually, email changes) while signed in, explicitly named as
  "not yet built" by both `/update-password`'s reset-link-required state
  and `/account`'s own page copy. Not started in this milestone; see
  "`/update-password` scope" for why it needs to be a separate route rather
  than reusing `/update-password`.
- Everything under "Future security work" above (rate limiting beyond
  Supabase's own, email-change safeguards, application-level audit
  events).

### Hosted Supabase settings that will later require manual configuration

None of this milestone touches a hosted Supabase project — everything above
is local-only (`supabase/config.toml`). Before this auth flow can run
against a hosted development or production project, someone with dashboard
access will need to, by hand:

- Set the hosted project's **Site URL** and **Redirect URLs** (Auth →
  URL Configuration) to match the deployed app's real origin(s) — the
  `site_url`/`additional_redirect_urls` values in `supabase/config.toml`
  only apply to the local CLI stack.
- Recreate the custom **confirmation** and **recovery** email templates
  (`supabase/templates/confirmation.html`, `recovery.html`) in the hosted
  project's Auth → Email Templates dashboard — `content_path` in
  `config.toml` only wires up local development; it has no effect on a
  linked hosted project (`docs/supabase-development.md` already notes this
  for local vs. hosted generally).
- Confirm the hosted project's **password policy** (Auth → Policies, or the
  hosted project's own settings) is at least as strict as this app's own
  (`src/lib/auth/password-policy.ts`: minimum length 8, at least one letter
  and one digit) — the local `config.toml` values
  (`minimum_password_length = 8`, `password_requirements =
  "letters_digits"`) raised/set in this milestone only apply to the CLI
  stack and don't carry over to a hosted project automatically.
- Review the hosted project's **email rate limits** — the 30/hour value
  raised in this milestone is local-only and won't carry over.
- **Configure production SMTP.** Supabase's shared local/default email
  sending is explicitly not for production use (rate-limited, best-effort).
  A real SMTP provider must be configured (Auth → Email → SMTP Settings, or
  `[auth.email.smtp]` for a self-hosted deployment) before real users can
  register or reset passwords on a hosted/production project. This
  milestone deliberately does not configure this, per its own scope.
