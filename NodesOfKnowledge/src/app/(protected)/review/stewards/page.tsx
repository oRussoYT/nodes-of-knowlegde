import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { pageTitle } from "@/config/site";
import { listInstitutionOptions } from "@/features/import/read";
import { grantInstitutionStewardAction, revokeInstitutionStewardAction } from "@/features/steward/actions";
import { getStewardScope, listInstitutionStewards } from "@/features/steward/read";

// Institution stewards (ROTEIRO etapa 3): who looks after which institution's
// part of the record. Platform reviewers appoint and remove; every change is
// audited in the database.
export const metadata: Metadata = {
  title: pageTitle("Institution stewards"),
};

export default async function StewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;
  const scope = await getStewardScope();

  if (!scope.platform) {
    return (
      <main id="main-content" tabIndex={-1} className="py-16">
        <Container width="content">
          <PageHeader title="Institution stewards" />
          <EmptyState className="mt-8" title="Only platform reviewers appoint stewards" />
        </Container>
      </main>
    );
  }

  const [stewards, institutions] = await Promise.all([listInstitutionStewards(), listInstitutionOptions()]);

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Institution stewards"
          description="Each institution can have its own stewards. They see and act only on the people documented at their institution."
          action={
            <Link href="/review/console" className="text-sm underline underline-offset-2">
              Steward console
            </Link>
          }
        />

        {typeof error === "string" ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}

        <form action={grantInstitutionStewardAction} className="mt-8 flex flex-col gap-4 rounded-md border border-border-default px-4 py-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="organizationId">Institution</Label>
            <Select id="organizationId" name="organizationId" required defaultValue="">
              <option value="" disabled>
                Choose an institution
              </option>
              {institutions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email of their account</Label>
            <Input id="email" name="email" type="email" required placeholder="name@university.edu" />
            <p className="text-xs text-muted-foreground">The person must already have an account.</p>
          </div>
          <div>
            <Button type="submit">Appoint steward</Button>
          </div>
        </form>

        <section aria-labelledby="current-heading" className="mt-12">
          <h2 id="current-heading" className="text-sm font-medium text-foreground">
            Current stewards
          </h2>
          {stewards.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No institution stewards yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {stewards.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-default px-4 py-3 text-sm">
                  <span>
                    <span className="font-medium text-foreground">{s.organizationName}</span>
                    <span className="text-muted-foreground"> · {s.email}</span>
                  </span>
                  <form action={revokeInstitutionStewardAction}>
                    <input type="hidden" name="stewardId" value={s.id} />
                    <Button type="submit" size="sm" emphasis="ghost">
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </main>
  );
}
