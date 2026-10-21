// Single source of truth for theme-persistence keys — referenced by both
// the pure parsing helpers (parse.ts), the generated inline anti-FOUC
// script (inline-script.ts), and the client-side apply function
// (apply-theme.ts), so all three ever agree on where the preference lives.
// See docs/decisions/0002-theming-and-server-client-theme-handling.md.
export const THEME_STORAGE_KEY = "netpdbff-theme";
export const THEME_COOKIE_NAME = "netpdbff-theme";
