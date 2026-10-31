import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { FutureAction } from "@/components/ui/FutureAction";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";

import { getIdentityStatus } from "@/features/identity/status";
import { getIdentityStatusCopy } from "@/features/identity/copy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: pageTitle("Account"),
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

// M5.2 redesign, extended in M5.3 with a read-only identity-link status
// section. Every fact in the account-facts Card, the Supabase call that
// fetches them, and the two real links are unchanged from M4/M5.1: still
// `getUser()` (not `getClaims()`), for the same reason as before —
// `created_at`/`email_confirmed_at` live on the full user record, not the
// JWT claims (see docs/authentication-implementation.md's
// getClaims/getUser/getSession guidance).
//
// Per the M5.3 brief, this page shows only the account's own identity-link
// *state* — no profile editing, no claim submission/withdrawal controls
// (those belong to /member and /member/claim), no moderation controls, and
// the identity-link section stays visually and structurally separate from
// the account-security Card above it, never blended into the same `dl`.
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const identityStatus = await getIdentityStatus();
  const statusCopy = getIdentityStatusCopy(identityStatus);

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Account"
          description="Minimal information about your Nodes of Knowledge sign-in account. This is not a person profile."
        />

        {/* Authentication/account information — real, currently-true facts. */}
        <Card className="mt-8">
          <dl className="divide-y divide-border-default text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-foreground">{user?.email ?? "Unknown"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Email confirmed</dt>
              <dd className="text-foreground">{user?.email_confirmed_at ? "Yes" : "No"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Account created</dt>
              <dd className="text-foreground">{formatDate(user?.created_at)}</dd>
            </div>
          </dl>
        </Card>

        {/* Identity-link status — read-only display only. Deliberately a
            separate Card from the account-security facts above: this is
            person-record linkage information, not authentication data.
            No claim/search/withdraw controls live here — see Member area
            for those. */}
        <Card className="mt-6">
          <h2 className="text-sm font-medium text-foreground">Person-record link</h2>
          <p className="mt-2 text-sm text-foreground">{statusCopy.title}.</p>
          <p className="mt-1 text-sm text-muted-foreground">{statusCopy.description}</p>
          {identityStatus.kind === "rejected" && identityStatus.claim.decisionNotes ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Reviewer note: {identityStatus.claim.decisionNotes}
            </p>
          ) : null}
          <p className="mt-3 text-sm">
            <Link href="/member" className="font-medium text-foreground underline underline-offset-2">
              Manage in the Member area
            </Link>
          </p>
        </Card>

        {/* Future person-record/profile functionality — clearly separated
            from the real account facts above, never implied to exist yet. */}
        <EmptyState
          className="mt-6"
          title="Changing your password while signed in isn't available yet"
          description="This will live under Account → Security in a later milestone."
          action={<FutureAction label="Account → Security" />}
        />

        <p className="mt-4 text-sm text-muted-foreground">
          To reset a forgotten password now, use{" "}
          <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-2">
            Forgot password
          </Link>{" "}
          from the login page.
        </p>
      </Container>
    </main>
  );
}
