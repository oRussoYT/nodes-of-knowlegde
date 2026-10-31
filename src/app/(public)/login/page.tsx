import type { Metadata } from "next";
import Link from "next/link";

import { ResendConfirmationForm } from "@/components/auth/ResendConfirmationForm";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/FormMessage";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { sanitizeReturnTo } from "@/lib/auth/validation";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: pageTitle("Log in"),
};

interface LoginPageProps {
  searchParams: Promise<{ returnTo?: string }>;
}

// Already-authenticated visitors never render this: src/middleware.ts redirects
// them away before the request reaches here. This page still works
// correctly if visited directly during the brief window before a proxy
// redirect completes, since the form simply re-authenticates the same user.
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = sanitizeReturnTo(params.returnTo);

  // A `returnTo` only ever appears here because src/middleware.ts (or
  // src/app/(protected)/layout.tsx) sent this visitor away from a
  // protected route — i.e. they were trying to reach somewhere that
  // requires a session and don't currently have a valid one. That's true
  // whether they never had one or a session they did have has expired; the
  // wording below deliberately doesn't claim to know which.
  const cameFromProtectedRoute = Boolean(params.returnTo);

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="form">
        {/* No `description` when the expired-session banner is shown below —
            the banner takes over that role; PageHeader only ever renders one
            or the other, never both, matching the exact M4 behavior this
            replaces. */}
        <PageHeader
          title="Log in"
          description={cameFromProtectedRoute ? undefined : "Sign in to your Nodes of Knowledge account."}
        />

        {/* Explicit "expired session" state. */}
        {cameFromProtectedRoute ? (
          <div className="mt-4">
            <FormMessage tone="info">
              Please log in to continue. If you were signed in before, your session may have
              expired.
            </FormMessage>
          </div>
        ) : null}

        <div className="mt-8">
          <LoginForm returnTo={returnTo} />
        </div>

        <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-2">
              Register
            </Link>
          </p>
          <p>
            <Link
              href="/forgot-password"
              className="font-medium text-foreground underline underline-offset-2"
            >
              Forgot your password?
            </Link>
          </p>
        </div>

        <details className="mt-6 text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">
            Didn&apos;t get a confirmation email?
          </summary>
          <div className="mt-3">
            <ResendConfirmationForm />
          </div>
        </details>
      </Container>
    </main>
  );
}
