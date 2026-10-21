// Standard "skip to main content" link — the first focusable element on
// every page via AppShell, invisible until keyboard-focused (`sr-only` /
// `focus:not-sr-only`), so a keyboard-only visitor never has to tab through
// the full header/nav on every single page. Targets `#main-content`, which
// every page's own `<main>` element carries — see AppShell.tsx's file
// comment for why `<main>` itself stays page-owned rather than moving into
// the shell. Native fragment navigation (a plain `<a href="#...">`, not
// client-side JS): works even if hydration hasn't finished yet, and is what
// "no unlabeled control, full keyboard operability" (docs/design-system-architecture.md)
// means in practice for this specific, well-known pattern. Server Component:
// no interactivity of its own beyond the browser's native anchor behavior.
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-(--z-skip-link) focus:rounded-md focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border-focus"
    >
      Skip to main content
    </a>
  );
}
