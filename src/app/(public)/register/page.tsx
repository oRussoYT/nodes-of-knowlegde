import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";

import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: pageTitle("Register"),
};

// Registration creates only a Supabase Auth account — see
// docs/decisions/0001-separate-people-from-user-accounts.md and
// src/features/auth/actions/register.ts. It never creates a `people` row,
// a profile claim, or a user-person link.
export default function RegisterPage() {
  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="form">
        <PageHeader
          title="Create an account"
          description="This creates a Nodes BDFFP account you can sign in with. Connecting the account to a specific person in PDBFF's history is a separate step, available after you confirm your email."
        />

        <div className="mt-8">
          <RegisterForm />
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
            Log in
          </Link>
        </p>
      </Container>
    </main>
  );
}
