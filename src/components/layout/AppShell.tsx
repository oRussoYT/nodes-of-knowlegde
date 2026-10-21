import type { ReactNode } from "react";

import { SkipLink } from "@/components/layout/SkipLink";

// The outer frame composing header + content + (future) footer, per
// docs/design-system-architecture.md's component table. Deliberately takes
// the header as a prop rather than deciding internally which variant to
// render — per ADR-0006, the *routing layer* (the root layout vs.
// `(protected)/layout.tsx`) chooses `PublicHeader` or `ProtectedHeader`,
// not a session check inside this shared component. Keeping that choice
// out of AppShell is what lets public routes stay statically renderable.
//
// Does not render a `<main>` landmark: every page in `src/app` already
// renders its own `<main>` (an M4-era convention, kept as-is here rather
// than migrated as part of the shell work — moving `<main>` ownership into
// AppShell is page-redesign-phase work, since it would require touching
// every page's markup, not a shell-only change). Introducing a second
// `<main>` here would both be invalid (more than one `main` landmark per
// page) and break `tests/e2e/register.spec.ts`'s existing
// `page.locator("main")` scoping. Revisit this note when pages are
// redesigned.
export interface AppShellProps {
  header: ReactNode;
  children: ReactNode;
}

export function AppShell({ header, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      {header}
      {children}
    </div>
  );
}
