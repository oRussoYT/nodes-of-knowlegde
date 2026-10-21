import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { RECOVERY_FLOW_HINT_COOKIE } from "@/lib/auth/recovery-flow-hint";

import { UpdatePasswordForm } from "./UpdatePasswordForm";

export const metadata: Metadata = {
  title: pageTitle("Reset password"),
};

// Scope note (milestone quality review): this page is for *completing a
// password reset started from the recovery email link*
// (/auth/confirm?type=recovery), not a general "change your password while
// signed in" page — that will live at /account/security once voluntary
// password changes are implemented (see docs/authentication-implementation.md,
// "/update-password scope" and "What remains").
//
// The `(protected)` layout (src/app/(protected)/layout.tsx) already
// guarantees a real, verified Supabase session before this component ever
// renders — an unauthenticated visitor never reaches the code below,
// regardless of any cookie they might be carrying. What this page
// additionally checks is a *UX hint*, not a second authorization layer:
// the recovery-flow hint cookie set by /auth/confirm
// (src/lib/auth/recovery-flow-hint.ts — read that file before assuming
// this check does more than it does). Its presence just picks which
// explanation to show. A signed-in visitor who never went through the
// recovery link — or who set this cookie themselves — can still reach the
// password form below; what they can do with it is unchanged either way:
// change the password of the account they're already signed in as. See
// "Password-update authorization" in docs/authentication-implementation.md.
export default async function UpdatePasswordPage() {
  const cookieStore = await cookies();
  const hasRecoveryFlowHint = cookieStore.get(RECOVERY_FLOW_HINT_COOKIE) !== undefined;

  if (!hasRecoveryFlowHint) {
    return (
      <main id="main-content" tabIndex={-1} className="py-16">
        <Container width="form">
          {/* Title-only PageHeader: this branch has two paragraphs, not one
              `description` string, so they're rendered below with the same
              `text-muted-foreground` treatment PageHeader's own description
              uses internally — visually identical, just not forced through a
              single-string prop. */}
          <PageHeader title="Reset link required" />
          <p className="mt-2 text-sm text-muted-foreground">
            This page completes a password reset started from an email link. Request a new link
            below if you want to reset your password.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Looking to change your password while signed in? That will be available soon under
            Account → Security.
          </p>

          <div className="mt-8 flex flex-col gap-2 text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-foreground underline underline-offset-2"
            >
              Request a password-reset link
            </Link>
            <Link href="/account" className="font-medium text-foreground underline underline-offset-2">
              Back to account
            </Link>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="form">
        <PageHeader
          title="Reset your password"
          description="Your reset link has been verified. Choose a new password below."
        />

        <div className="mt-8">
          <UpdatePasswordForm />
        </div>
      </Container>
    </main>
  );
}
