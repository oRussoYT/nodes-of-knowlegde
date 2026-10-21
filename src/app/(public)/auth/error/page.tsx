import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";

export const metadata: Metadata = {
  title: pageTitle("Link problem"),
};

export default function AuthErrorPage() {
  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="form">
        <PageHeader
          title="This link didn't work"
          description="The confirmation or password-reset link you followed is invalid or has expired. Links can only be used once and stop working after a while — request a new one below."
        />

        <div className="mt-8 flex flex-col gap-2 text-sm">
          <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
            Go to log in
          </Link>
          <Link
            href="/register"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Create a new account
          </Link>
          <Link
            href="/forgot-password"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Request a new password-reset link
          </Link>
        </div>
      </Container>
    </main>
  );
}
