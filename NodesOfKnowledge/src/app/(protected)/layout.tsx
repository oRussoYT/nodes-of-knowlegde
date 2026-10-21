import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { ProtectedHeader } from "@/components/layout/ProtectedHeader";
import { isCurrentUserReviewer } from "@/features/review/authorization";
import { createClient } from "@/lib/supabase/server";

// Wraps /member, /account, /update-password (this is a route group — the
// parentheses don't add a URL segment). src/proxy.ts already redirects
// unauthenticated requests to these paths before they reach the app, but
// this layout independently re-verifies the session here too, per "session
// verification on protected server-rendered pages" — proxy decisions are
// not the sole authorization check, since middleware/proxy state can be
// bypassed or misconfigured in ways a server-rendered page's own check
// cannot be.
//
// `getClaims()` verifies the JWT signature rather than trusting whatever is
// in the session cookie — see src/lib/supabase/proxy.ts for the same
// principle applied in the proxy. The claims fetched here are also handed
// to ProtectedHeader (via AppShell), so displaying the signed-in email in
// the nav doesn't cost a second Supabase call.
//
// AppShell + ProtectedHeader own the `<header>`; this layout no longer
// renders ProtectedNav directly (superseded — see
// src/components/layout/ProtectedHeader.tsx) or PublicHeader (the M4-era
// root layout rendered it unconditionally, which meant every page here
// showed both headers stacked — fixed in M5.2 by moving header choice to
// the routing layer; see src/app/layout.tsx and src/app/(public)/layout.tsx).
export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const email = typeof data.claims.email === "string" ? data.claims.email : "your account";

  // One extra, cheap RPC on an already-force-dynamic, already-Supabase-
  // calling layout (per ADR-0006, this cost is only acceptable here
  // because every route under (protected) is already dynamic for
  // unrelated reasons -- a PublicHeader-reachable component must never
  // do this). Purely a nav-visibility signal -- see
  // src/features/review/authorization.ts's own doc comment for why this
  // is not, and must never become, the authorization boundary itself.
  const isReviewer = await isCurrentUserReviewer();

  return (
    <AppShell header={<ProtectedHeader email={email} isReviewer={isReviewer} />}>{children}</AppShell>
  );
}
