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
import { addOrganizationNameAction, removeOrganizationNameAction } from "@/features/institution-names/actions";
import { describePeriod, NAME_TYPE_LABELS, NAME_TYPES } from "@/features/institution-names/parse";
import { listCuratedNames } from "@/features/institution-names/read";
import { getStewardScope } from "@/features/steward/read";

// Institution names over time (ROTEIRO etapa 0, a Mac piece rebuilt): an
// institution did not always have its current name. Stewards record former,
// other, Indigenous and translated names with their years; the institution
// page shows them. Every change is audited in the database.
export const metadata: Metadata = {
  title: pageTitle("Institution names"),
};

export default async function InstitutionNamesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const org = typeof raw.org === "string" ? raw.org : null;
  const error = typeof raw.error === "string" ? raw.error : null;

  const scope = await getStewardScope();
  const choices = scope.platform ? await listInstitutionOptions() : scope.organizations;
  const organizationId =
    org && choices.some((o) => o.id === org) ? org : (choices[0]?.id ?? null);
  const orgName = choices.find((o) => o.id === organizationId)?.name ?? "";
  const names = organizationId ? await listCuratedNames(organizationId) : null;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Institution names"
          description="Former, other, Indigenous and translated names, each with the years it was used. They appear on the institution's page."
          action={
            <Link href="/review/console" className="text-sm underline underline-offset-2">
              Steward console
            </Link>
          }
        />

        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}

        {choices.length === 0 || !organizationId ? (
          <EmptyState className="mt-8" title="No institution to look after yet" />
        ) : (
          <>
            <form method="get" className="mt-6 flex flex-wrap items-end gap-3 text-sm">
              <div className="flex min-w-60 flex-col gap-1.5">
                <Label htmlFor="org">Institution</Label>
                <Select id="org" name="org" defaultValue={organizationId}>
                  {choices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" emphasis="secondary" size="sm">
                Show
              </Button>
            </form>

            <section aria-labelledby="names-heading" className="mt-10">
              <h2 id="names-heading" className="text-sm font-medium text-foreground">
                Names of {orgName}
              </h2>
              {names === null ? (
                <p className="mt-3 text-sm text-muted-foreground">These names could not be loaded.</p>
              ) : names.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Only the current name is recorded.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {names.map((n) => (
                    <li
                      key={n.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-default px-4 py-3 text-sm"
                    >
                      <span>
                        <span className="font-medium text-foreground">{n.name}</span>
                        <span className="text-muted-foreground">
                          {" · "}
                          {NAME_TYPE_LABELS[n.nameType]}
                          {n.language ? ` · ${n.language}` : ""}
                          {describePeriod(n.startYear, n.endYear) ? ` · ${describePeriod(n.startYear, n.endYear)}` : ""}
                          {n.verified ? "" : " · recorded by a steward"}
                        </span>
                      </span>
                      <form action={removeOrganizationNameAction}>
                        <input type="hidden" name="organizationId" value={organizationId} />
                        <input type="hidden" name="nameId" value={n.id} />
                        <Button type="submit" size="sm" emphasis="ghost">
                          Remove
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <form
              action={addOrganizationNameAction}
              className="mt-10 grid gap-4 rounded-md border border-border-default px-4 py-5 sm:grid-cols-2"
            >
              <input type="hidden" name="organizationId" value={organizationId} />
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Instituto Nacional de Pesquisas da Amazônia" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nameType">Kind of name</Label>
                <Select id="nameType" name="nameType" defaultValue="former">
                  {NAME_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {NAME_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="language">Language (optional)</Label>
                <Input id="language" name="language" placeholder="pt, en, Tupi…" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startYear">Used from (year, optional)</Label>
                <Input id="startYear" name="startYear" inputMode="numeric" pattern="\d{4}" placeholder="1952" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="endYear">Until (year, optional)</Label>
                <Input id="endYear" name="endYear" inputMode="numeric" pattern="\d{4}" placeholder="1987" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Add name</Button>
              </div>
            </form>
          </>
        )}
      </Container>
    </main>
  );
}
