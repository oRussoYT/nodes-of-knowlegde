import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { pageTitle } from "@/config/site";
import { proposeContributionAction } from "@/features/contribution-candidates/actions";
import { STATUS_LABEL } from "@/features/contribution-candidates/parse";
import { getContributionOptions, listMyCandidates } from "@/features/contribution-candidates/read";
import { getIdentityStatus } from "@/features/identity/status";

// Propose a contribution to your own record (candidate -> review -> record).
// A proposal is not the record: it is labelled "waiting for review" until a
// steward of your institution accepts it.
export const metadata: Metadata = {
  title: pageTitle("Propose a contribution"),
};

const TONE = { pending: "info", accepted: "success", rejected: "neutral" } as const;

export default async function ProposeContributionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const error = typeof raw.error === "string" ? raw.error : null;
  const sent = raw.sent === "1";

  const identity = await getIdentityStatus();
  const personId = identity.kind === "approved" ? identity.claim.personId : null;
  const options = personId ? await getContributionOptions() : null;
  const mine = personId ? await listMyCandidates() : [];

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Propose a contribution"
          description="Something you helped bring into being — a protocol, a dataset, a trail, a training. A steward checks what documents it before it joins your record."
          action={
            <Link href="/member" className="text-sm underline underline-offset-2">
              Member area
            </Link>
          }
        />

        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        {sent ? (
          <Alert tone="success" className="mt-6">
            Sent. It waits for a steward and is not part of your record until they accept it.
          </Alert>
        ) : null}

        {!personId || !options ? (
          <EmptyState
            className="mt-8"
            title="Link your account to your record first"
            description="Proposals are made for your own person record. Claim it from the Member area."
          />
        ) : (
          <>
            <form action={proposeContributionAction} className="mt-8 grid gap-4 rounded-md border border-border-default px-4 py-5 sm:grid-cols-2">
              <input type="hidden" name="personId" value={personId} />
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required placeholder="e.g. Point-count protocol for forest fragments" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kind">Kind of contribution</Label>
                <Select id="kind" name="kind" required defaultValue="">
                  <option value="" disabled>
                    Choose one
                  </option>
                  {options.kinds.map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="capacity">How you contributed</Label>
                <Select id="capacity" name="capacity" required defaultValue="">
                  <option value="" disabled>
                    Choose one
                  </option>
                  {options.capacities.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="sourceNote">What documents it</Label>
                <Input id="sourceNote" name="sourceNote" required placeholder="e.g. MSc thesis, 1998, chapter 2" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="description">Short description (optional)</Label>
                <Textarea id="description" name="description" rows={3} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startYear">From (year, optional)</Label>
                <Input id="startYear" name="startYear" inputMode="numeric" pattern="\d{4}" placeholder="1996" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="endYear">Until (year, optional)</Label>
                <Input id="endYear" name="endYear" inputMode="numeric" pattern="\d{4}" placeholder="1998" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Send for review</Button>
              </div>
            </form>

            <section aria-labelledby="mine-heading" className="mt-12">
              <h2 id="mine-heading" className="text-sm font-medium text-foreground">
                Your proposals
              </h2>
              {mine.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">You have not proposed anything yet.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {mine.map((c) => (
                    <li key={c.id} className="rounded-md border border-border-default px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {c.contributionId ? (
                          <Link href={`/contributions/${c.contributionId}`} className="font-medium text-foreground underline underline-offset-2">
                            {c.title}
                          </Link>
                        ) : (
                          <span className="font-medium text-foreground">{c.title}</span>
                        )}
                        <Badge size="sm" tone={TONE[c.status]}>
                          {STATUS_LABEL[c.status]}
                        </Badge>
                      </div>
                      {c.decisionNote ? <p className="mt-1 text-muted-foreground">Steward note: {c.decisionNote}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </Container>
    </main>
  );
}
