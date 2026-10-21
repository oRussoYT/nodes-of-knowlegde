import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";

import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: pageTitle("Forgot password"),
};

export default function ForgotPasswordPage() {
  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="form">
        <PageHeader
          title="Reset your password"
          description="Enter the email address for your account and we'll send you a link to choose a new password."
        />

        <div className="mt-8">
          <ForgotPasswordForm />
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
            Back to log in
          </Link>
        </p>
      </Container>
    </main>
  );
}
