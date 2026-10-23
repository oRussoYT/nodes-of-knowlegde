import Link from "next/link";

import { getIdentityStatusCopy } from "@/features/identity/copy";
import { getIdentityStatus } from "@/features/identity/status";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" });
}

// "Access and security" on the profile page: the sign-in facts (only the
// member sees them) and the link between this account and a person record.
// getUser(), not getClaims(): created_at / email_confirmed_at live on the
// full user record.
export async function AccessSection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const identityStatus = await getIdentityStatus();
  const statusCopy = getIdentityStatusCopy(identityStatus);

  return (
    <section id="access" aria-labelledby="access-heading" className="mt-6 rounded-3xl border border-border-default bg-surface p-6 sm:p-8">
      <h2 id="access-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">
        Access and security
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Only you see this part.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <dl className="divide-y divide-border-default rounded-2xl border border-border-default text-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-muted-foreground">Sign-in email</dt>
            <dd className="text-right text-foreground [overflow-wrap:anywhere]">{user?.email ?? "Unknown"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-muted-foreground">Email confirmed</dt>
            <dd className="text-foreground">{user?.email_confirmed_at ? "Yes" : "No"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="text-foreground">{formatDate(user?.created_at)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-muted-foreground">Password</dt>
            <dd>
              <Link href="/update-password" className="font-medium text-foreground underline underline-offset-4">
                Change password
              </Link>
            </dd>
          </div>
        </dl>

        <div className="rounded-2xl border border-border-default p-4 text-sm">
          <h3 className="font-medium text-foreground">Your record in the project</h3>
          <p className="mt-2 text-foreground">{statusCopy.title}.</p>
          <p className="mt-1 text-muted-foreground">{statusCopy.description}</p>
          {identityStatus.kind === "rejected" && identityStatus.claim.decisionNotes ? (
            <p className="mt-1 text-muted-foreground">Reviewer note: {identityStatus.claim.decisionNotes}</p>
          ) : null}
          <p className="mt-3">
            {identityStatus.kind === "approved" ? (
              <Link href={`/people/${identityStatus.claim.personId}`} className="font-medium text-foreground underline underline-offset-4">
                Open your record
              </Link>
            ) : identityStatus.kind === "pending" ? (
              <Link href="/member" className="font-medium text-foreground underline underline-offset-4">
                See your request in the Member area
              </Link>
            ) : (
              <Link href="/member/claim" className="font-medium text-foreground underline underline-offset-4">
                Find your record
              </Link>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
