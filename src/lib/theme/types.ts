// Only two real themes — no "system" value is persisted. "Follow system" is
// simply the absence of a stored preference (see globals.css's
// prefers-color-scheme fallback block), matching
// docs/decisions/0002-theming-and-server-client-theme-handling.md.
export type Theme = "light" | "dark";
