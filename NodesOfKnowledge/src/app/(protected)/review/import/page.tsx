import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { pageTitle } from "@/config/site";
import { createImportBatchAction } from "@/features/import/actions";
import { listImportBatches, listInstitutionOptions } from "@/features/import/read";
import { getStewardScope } from "@/features/steward/read";

// Import a graduate list (docs/ROTEIRO.md etapa 4). Reviewer-only (the
// /review layout checks, and every database function checks again). Upload
// puts the list in staging; nothing enters the record until a steward
// decides each row on the batch page.
export const metadata: Metadata = {
  title: pageTitle("Import a list"),
};

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;
  const scope = await getStewardScope();
  // Institution stewards import only into their own institutions (etapa 3).
  const [batches, institutions] = await Promise.all([
    listImportBatches(),
    scope.platform ? listInstitutionOptions() : Promise.resolve(scope.organizations),
  ]);

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Import a list"
          description="Upload a list of graduates. Each person is checked against the record and waits for your decision: same person, new person, or skip."
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

        <form action={createImportBatchAction} className="mt-8 flex flex-col gap-5 rounded-md border border-border-default px-4 py-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Name of the list</Label>
            <Input id="label" name="label" required placeholder="PhD graduates, Ecology, 2015–2020" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="organizationId">Institution the list comes from</Label>
            <Select id="organizationId" name="organizationId" defaultValue={scope.platform ? "" : (institutions[0]?.id ?? "")}>
              {scope.platform ? <option value="">No institution</option> : null}
              {institutions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              When set, each accepted person is documented as a student there (date unknown; year and degree kept as a note).
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="csvFile">CSV file</Label>
            <input id="csvFile" name="csvFile" type="file" accept=".csv,text/csv,text/plain" className="text-sm" />
            <p className="text-xs text-muted-foreground">
              First line names the columns: given name, family name (or one &quot;name&quot; column), and optionally degree,
              programme, graduation year, id. Commas or semicolons both work.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="csvText">…or paste the list</Label>
            <Textarea
              id="csvText"
              name="csvText"
              rows={5}
              placeholder={"given name,family name,degree,graduation year\nAna,Lima,PhD,2018"}
            />
          </div>

          <div>
            <Button type="submit">Upload for review</Button>
          </div>
        </form>

        <section aria-labelledby="batches-heading" className="mt-12">
          <h2 id="batches-heading" className="text-sm font-medium text-foreground">
            Lists uploaded
          </h2>
          {batches.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No lists yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {batches.map((b) => (
                <li key={b.id} className="rounded-md border border-border-default px-4 py-3 text-sm">
                  <Link href={`/review/import/${b.id}`} className="font-medium underline underline-offset-2">
                    {b.label}
                  </Link>
                  <span className="text-muted-foreground">
                    {b.organizationName ? ` · ${b.organizationName}` : ""} · {b.total} people · {b.pending} waiting ·{" "}
                    {b.matched} matched · {b.created} new · {b.skipped} skipped
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </main>
  );
}
