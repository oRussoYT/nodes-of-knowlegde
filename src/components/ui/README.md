# src/components/ui

Small, generic, reusable UI primitives with no feature-specific or business
logic. This is the base design-system layer other components build on — see
`docs/design-system-architecture.md` for the full token/component
architecture and `docs/decisions/0007-...md` for why every component here
is named and scoped as domain-neutral platform infrastructure, not after
PDBFF-specific concepts.

**Status: M5.1 (Design Foundations) + one M5.2 addition.** M5.1 built the
design token system, the theming mechanism, and the complete primitive
component library below, including the Radix-backed interactive primitives.
M5.2 (shells, navigation, and page redesigns — see
`src/components/layout/README.md`) added exactly one new primitive here,
`FutureAction` (see the presentational-primitives table below); every other
component in this file is unchanged M5.1 work, just now wired into real
pages. `Toast` was not built (see "Not built in M5.1" below).

All components are Server Components unless noted "Client Component" —
per `docs/design-system-architecture.md`'s "Component-composition
principles," the `"use client"` boundary is kept as low in the tree as
possible.

## Tokens and theming

- **Design tokens** — `src/app/globals.css`. Color primitives, semantic
  color roles (including the deferred `status-*` verification vocabulary),
  typography scale, spacing (Tailwind defaults, confirmed not replaced),
  radii, borders, shadows, breakpoints (Tailwind defaults), motion, opacity,
  z-index, and named container widths. Only semantic tokens are used in
  component code — never a raw Tailwind color utility.
- **Theming** — `src/lib/theme/` (`constants.ts`, `types.ts`, `parse.ts`,
  `inline-script.ts`, `apply-theme.ts`) + `src/components/theme/ThemeScript.tsx`,
  wired into `src/app/layout.tsx`. Implements
  `docs/decisions/0002-theming-and-server-client-theme-handling.md`: a
  `data-theme` attribute on `<html>`, set by a blocking inline script before
  first paint, with `localStorage`+cookie persistence and a
  `prefers-color-scheme` fallback for visitors with no explicit preference.
  The real theme-toggle control is `src/components/theme/ThemeToggle.tsx`
  (M5.2) — a `Switch` wired to `applyTheme`, rendered in both `PublicHeader`
  and `ProtectedHeader`. `src/app/dev/design-system/ThemeToggleDemo.tsx`
  wraps the same component rather than duplicating its logic.

## Layout primitives

| Component | Purpose | Key props |
|---|---|---|
| `Container` | Centers content at a named, purpose-based max-width (`form`/`shell`/`content`/`full`), not an ad hoc per-page value. | `width`, `padded`, `as` |
| `Stack` | Generic flexbox layout (row/column, gap, align, justify, wrap). | `direction`, `gap`, `align`, `justify`, `wrap` |
| `Grid` | Mobile-first responsive grid, column count steps at the `md` breakpoint. | `cols` (1–4), `gap` |
| `Surface` | The generic background/elevation building block underneath Card and future Dialog/Dropdown surfaces. | `level`, `elevation`, `bordered`, `rounded` |
| `Section` | A labeled unit of vertical rhythm around a page section. | `spacing` |
| `Divider` | Horizontal/vertical rule, optionally with a centered label (e.g. "or"). | `orientation`, `label` |

```tsx
import { Container } from "@/components/ui/Container";
import { Stack } from "@/components/ui/Stack";
import { Surface } from "@/components/ui/Surface";

<Container width="content">
  <Stack gap="md">
    <Surface bordered rounded elevation="sm" className="p-4">Content</Surface>
  </Stack>
</Container>;
```

## Presentational primitives

| Component | Purpose | Key props |
|---|---|---|
| `Button` | Generic action trigger. | `emphasis` (primary/secondary/ghost/destructive), `size` (sm/md/lg), `fullWidth` |
| `Card` | Formalizes the ad hoc bordered box already used on `/`, `/member`, `/account`. | `padded` |
| `Badge` | Small status label — always paired with a text label, never color alone. | `tone`, `size` |
| `Avatar` | Text-initials placeholder (deterministic, muted color) or photo. Never a generic silhouette. | `name` (required), `src`, `size` |
| `Alert` | Page-level banner — the `FormMessage` tone vocabulary, for non-form use. | `tone`, `title` |
| `Skeleton` | Shape-matching loading placeholder. | `variant` (text/block/circle) |
| `Spinner` | Short in-flight-action indicator. **`label` is required** — never a spinner with no text equivalent. | `size`, `label`, `showLabel` |
| `EmptyState` | Honest "not yet available" state — never a fabricated zero or fake-loading skeleton. | `title`, `description`, `action` |
| `PageHeader` | The repeated `<h1>` + description + optional action pattern from every M4 page. | `title`, `description`, `action` |
| `FutureAction` | **M5.2.** A labeled destination/action that's real in the product's planned structure but not built yet — inert text + a "Soon" `Badge`, never a disabled-looking button or a link to nowhere. No `role`/`href`/`onClick`: unambiguously non-interactive, not just visually muted. Shared by `NavLink` (planned nav entries) and the `/member`/`/account` empty states, so navigation and page content use one "coming later" vocabulary instead of two. | `label`, `reason` |

```tsx
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

<Button emphasis="primary" size="md">Save</Button>
<Badge tone="success">Confirmed</Badge>
<EmptyState title="Not yet connected" description="No participation history recorded." />;
```

## Form primitives

| Component | Purpose | Key props |
|---|---|---|
| `Label` | Field label, with an optional required-marker. | `required` |
| `HelperText` | Field hint text (pair with a field's `aria-describedby`). | — |
| `FieldError` | Field error text, `role="alert"` (pair with `aria-describedby`). | — |
| `Input` | Standalone text input — the same control `FormField` wraps. | `invalid` |
| `Textarea` | Multi-line text input. | `invalid` |
| `Select` | Native `<select>`, styled — not a custom listbox. | `invalid` |
| `Checkbox` | Native checkbox, `accent-color`-themed, optional inline `label`. | `label` |
| `Radio` | Native radio, `accent-color`-themed, optional inline `label`. | `label` |
| `Switch` | Toggle control (`role="switch"`). Controlled and uncontrolled. **Client Component.** | `checked`/`onCheckedChange` or `defaultChecked`, `disabled` |
| `FormField` | **Existing (M4), refactored in place.** Label + Input + hint + error, one call. Public API unchanged. | `label`, `name`, `error`, `hint`, plus native `<input>` props |
| `FormMessage` | **Existing (M4), refactored in place.** Form-level banner. Tone set widened: error/success/info/warning/neutral. | `tone` |

`FormField` intentionally still only wraps a single `<input>` in M5.1 —
composing `Textarea`/`Select`/`Checkbox`/`Radio` through a shared field
wrapper is real form-building work left to the pages that need it (M5.2).
The new standalone primitives above exist for exactly that future
composition; see `src/app/dev/design-system/page.tsx` for a worked example
of composing `Label` + `Textarea` + `HelperText` directly.

```tsx
import { FormField } from "@/components/ui/FormField"; // unchanged M4 API
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { HelperText } from "@/components/ui/HelperText";

<FormField label="Email" name="email" type="email" hint="We'll never share this." />;

<div className="flex flex-col gap-1.5">
  <Label htmlFor="bio">Bio</Label>
  <Textarea id="bio" />
  <HelperText>Optional.</HelperText>
</div>;
```

## Radix-backed interactive primitives

Per `docs/decisions/0003-component-primitives-headless-for-complex-interactions.md`:
Radix supplies focus trapping, focus return, portal rendering, `Escape`
handling, roving-tabindex, type-ahead, and correct ARIA roles/states; every
pixel of visual styling is this project's own Tailwind classes on tokens.
No animation library (ADR-0005) — enter/exit transitions are plain CSS
transitions keyed off Radix's own `data-[state]` attributes. None of these
are wired into any real page yet (no header/nav exists to put them in —
that's M5.2); `src/app/dev/design-system/InteractivePrimitivesDemo.tsx`
exercises all five with real open/close state.

| Component | Purpose | Key props |
|---|---|---|
| `Dialog` | Modal dialog. Anticipated near-term use: logout/destructive-action confirmation. | `DialogTrigger`, `DialogContent` (`showCloseButton`), `DialogTitle`, `DialogDescription`, `DialogClose` |
| `Drawer` | Side-anchored variant of the same Radix `Dialog` primitive (ADR-0003) — powers the future `MobileNavigation`. | Same shape as `Dialog`, plus `DrawerContent`'s `side` (`right`/`left`/`top`/`bottom`) |
| `Tabs` | Secondary navigation — e.g. a future `/account/security` second page. | `Tabs` (`defaultValue`/`value`), `TabsList`, `TabsTrigger`, `TabsContent` |
| `Tooltip` | Provenance/uncertainty disclosure, truncated-name-on-hover. **Requires `TooltipProvider` once near the app root** (not added anywhere yet). | `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` |
| `Dropdown` | Powers the future user menu. | `Dropdown`, `DropdownTrigger`, `DropdownContent`, `DropdownItem`, `DropdownLabel`, `DropdownSeparator` |

All are Client Components (Radix's primitives are themselves Client
Components; there is no Server Component variant).

```tsx
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

<Dialog>
  <DialogTrigger asChild>
    <Button emphasis="secondary">Log out</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogTitle>Log out?</DialogTitle>
    <DialogClose asChild>
      <Button emphasis="primary">Confirm</Button>
    </DialogClose>
  </DialogContent>
</Dialog>;
```

Icons (`X` in `Dialog`/`Drawer`'s default close button) use `lucide-react`,
imported per-icon per `docs/decisions/0004-icon-library-lucide.md` — the
first and, in M5.1, only icon usage in the codebase.

## Not built in M5.1

`Toast` — **formally deferred**, not blocked on anything. Full reasoning,
unresolved API/accessibility decisions, and target phase recorded in
`docs/design-system-architecture.md`'s "Toast: formal deferral" section —
read that before starting it. `Accordion` — Radix-backed per ADR-0003, but
the docs explicitly note no M5 page needs it yet ("useful later", not
"required in M5"), so it wasn't built either; no unresolved-design blocker
the way `Toast` has, just genuinely not needed yet.

## Internal verification aid

`src/app/dev/design-system/page.tsx` — development-only, gated out of
production (`notFound()` when `NODE_ENV === "production"`), not linked from
any real page. Renders every token and every component above, in both
themes, for manual review. Not a public style-guide route
(`docs/m5-application-ui-design-system.md` explicitly forbids that);
this is the "optional... development aid" it does allow.
