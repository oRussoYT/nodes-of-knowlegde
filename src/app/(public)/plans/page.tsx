import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { INSTITUTION_KINDS, PLANS } from "@/config/plans";
import { pageTitle } from "@/config/site";
import { requestPlanAction } from "@/features/university/actions";
import { REQUEST_STATUS_LABEL } from "@/features/university/parse";
import { getMyPlanRequests } from "@/features/university/read";
import { createClient } from "@/lib/supabase/server";

// Plans: free for biodiversity-conservation research institutions; paid for
// universities, research centres and museums. An institution asks here and a
// person answers -- nothing is charged on the site.
export const metadata: Metadata = {
  title: pageTitle("Plans"),
};

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const error = typeof raw.error === "string" ? raw.error : null;
  const sent = raw.sent === "1";
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = typeof data?.claims?.sub === "string";
  const mine = signedIn ? await getMyPlanRequests() : [];

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="shell">
        <PageHeader
          title="Plans"
          description="One engine, many Nodes. Conservation research institutions use it free of charge; universities, research centres and museums subscribe."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <section key={p.key} aria-labelledby={`plan-${p.key}`} className="flex flex-col rounded-md border border-border-default px-5 py-6">
              <h2 id={`plan-${p.key}`} className="font-display text-xl font-bold tracking-tight text-foreground">
                {p.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.forWhom}</p>
              <p className="mt-4 text-sm font-semibold text-foreground">{p.price}</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-foreground">
                {p.includes.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true">✓</span>
                    {i}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section id="request" aria-labelledby="request-heading" className="mt-14 max-w-2xl">
          <h2 id="request-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
            Ask for a plan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Tell us about your institution. A person answers, usually within a few days.</p>

          {error ? (
            <Alert tone="danger" className="mt-4">
              {error}
            </Alert>
          ) : null}
          {sent ? (
            <Alert tone="success" className="mt-4">
              Received. You will see the answer here.
            </Alert>
          ) : null}

          {!signedIn ? (
            <p className="mt-4">
              <Link href="/login?returnTo=/plans%23request" className={buttonVariants({ emphasis: "primary", size: "sm" })}>
                Sign in to ask for a plan
              </Link>
            </p>
          ) : (
            <form action={requestPlanAction} className="mt-4 grid gap-4 rounded-md border border-border-default px-4 py-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="institutionName">Institution</Label>
                <Input id="institutionName" name="institutionName" required maxLength={300} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="institutionKind">Kind of institution</Label>
                <Select id="institutionKind" name="institutionKind" required defaultValue="">
                  <option value="" disabled>
                    Choose one
                  </option>
                  {INSTITUTION_KINDS.map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactName">Your name</Label>
                <Input id="contactName" name="contactName" required maxLength={200} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactRole">Your role (optional)</Label>
                <Input id="contactRole" name="contactRole" maxLength={200} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="country">Country (optional)</Label>
                <Input id="country" name="country" maxLength={100} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="peopleEstimate">About how many people in your history? (optional)</Label>
                <Input id="peopleEstimate" name="peopleEstimate" inputMode="numeric" pattern="\d{1,8}" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="message">Anything else (optional)</Label>
                <Textarea id="message" name="message" rows={4} maxLength={3000} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Send request</Button>
              </div>
            </form>
          )}

          {mine.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-2">
              {mine.map((r) => (
                <li key={r.id} className="rounded-md border border-border-default px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{r.institutionName}</span>
                    <Badge size="sm" tone={r.status === "approved" ? "success" : r.status === "declined" ? "neutral" : "info"}>
                      {REQUEST_STATUS_LABEL[r.status]}
                    </Badge>
                  </div>
                  {r.answerNote ? <p className="mt-1 text-foreground">{r.answerNote}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </Container>
    </main>
  );
}
