// Pure route-protection decision logic for src/proxy.ts.
//
// Deliberately has no dependency on Next.js request/response types or
// Supabase so it can be unit tested directly (see
// tests/unit/route-protection.test.ts) without spinning up a server or a
// Supabase instance. src/proxy.ts is a thin adapter that calls
// `decideProxyAction` with values read from the real request, and turns the
// result into an actual redirect or pass-through response.
//
// IMPORTANT: this only decides *routing* (send them to /login, send them
// away from /login). It is not the sole authorization check — protected
// Server Components independently re-verify the session (see
// src/app/(protected)/layout.tsx) per "session verification on protected
// server-rendered pages" in docs/authentication-implementation.md.

import { sanitizeReturnTo } from "./validation";

/** Routes that require an authenticated session. */
export const PROTECTED_PATH_PREFIXES = ["/member", "/account", "/update-password", "/review"] as const;

/** Routes an already-authenticated visitor shouldn't be shown again. */
export const AUTH_ONLY_PATH_PREFIXES = ["/login", "/register"] as const;

export const DEFAULT_AUTHENTICATED_DESTINATION = "/member";
export const LOGIN_PATH = "/login";

export type ProxyDecision =
  | { action: "allow" }
  | { action: "redirect"; pathname: string; search?: string };

export interface ProxyDecisionInput {
  pathname: string;
  /** Leading-`?`-included search string, e.g. `?foo=bar`, or `""`. */
  search: string;
  isAuthenticated: boolean;
}

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function decideProxyAction(input: ProxyDecisionInput): ProxyDecision {
  const { pathname, search, isAuthenticated } = input;

  if (!isAuthenticated && matchesPrefix(pathname, PROTECTED_PATH_PREFIXES)) {
    const returnTo = sanitizeReturnTo(`${pathname}${search}`, pathname);
    const params = new URLSearchParams({ returnTo });
    return { action: "redirect", pathname: LOGIN_PATH, search: `?${params.toString()}` };
  }

  if (isAuthenticated && matchesPrefix(pathname, AUTH_ONLY_PATH_PREFIXES)) {
    const requestedReturnTo = new URLSearchParams(search).get("returnTo");
    const destination = sanitizeReturnTo(requestedReturnTo, DEFAULT_AUTHENTICATED_DESTINATION);
    return { action: "redirect", pathname: destination };
  }

  return { action: "allow" };
}
