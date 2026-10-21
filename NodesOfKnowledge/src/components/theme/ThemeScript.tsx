import { getThemeInitScript } from "@/lib/theme/inline-script";

// Fully static Server Component — no cookies()/session/Supabase call of any
// kind, so it never forces a route dynamic. Rendered once, in the root
// layout, which every public route shares — see
// docs/decisions/0006-public-static-shell-vs-authenticated-dynamic-shell.md,
// whose rule this component follows exactly.
//
// Renders a single, synchronous, blocking <script> as the very first thing
// in <body>, before any themed content (PublicHeader, page content) — this
// is what prevents a flash of incorrectly-themed content on first paint,
// per docs/decisions/0002-theming-and-server-client-theme-handling.md.
// Deliberately a literal <script> tag via dangerouslySetInnerHTML, not a
// "use client" component with a useEffect — it must run before React
// hydrates, not after.
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />;
}
