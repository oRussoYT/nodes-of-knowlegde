import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { pageTitle } from "@/config/site";
import { deleteSupportItemAction, saveSupportItemAction } from "@/features/support/actions";
import { SUPPORT_KINDS, SUPPORT_STATUSES, coaRows, otherSupportText, type TiedPerson } from "@/features/support/parse";
import { getSupportDraft } from "@/features/support/read";

// Declaring ties correctly (ROTEIRO, "Depois"): one's own grants and pending
// proposals -- private to the owner -- plus what the record already knows,
// as drafts for NIH Other Support and the NSF COA. A draft to check.
export const metadata: Metadata = {
  title: pageTitle("Declare your support and ties"),
};

const field = "rounded-md border border-border-default bg-surface px-3 py-2";

function PeopleTable({ title, people, when }: { title: string; people: TiedPerson[]; when: (p: TiedPerson) => string }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-foreground">
        {title} ({people.length})
      </h3>
      {people.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">None in the record.</p>
      ) : (
        <ul className="mt-1 text-sm">
          {people.map((p) => (
            <li key={`${title}-${p.personId}`}>
              <Link href={`/people/${p.personId}`} className="underline underline-offset-2">
                {p.name}
              </Link>
              {p.affiliation ? ` — ${p.affiliation}` : ""}
              <span className="text-muted-foreground"> · {when(p)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { error, saved } = await searchParams;
  const draft = await getSupportDraft();
  const span = (p: TiedPerson) => (p.startYear ? `${p.startYear}${p.endYear && p.endYear !== p.startYear ? `–${p.endYear}` : ""}` : "dates not recorded");

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <p className="text-sm">
          <Link href="/workspace" className="underline underline-offset-2">
            ← My research space
          </Link>
        </p>
        <PageHeader
          title="Declare your support and ties"
          description="Funders ask you to list every grant, pending proposal and in-kind support (NIH Other Support, NSF Current and Pending), and the people you are tied to (NSF Collaborators and Other Affiliations). List your support here — only you can see it — and the record fills in the people. It is a draft for you to check; nothing is sent anywhere."
        />

        {typeof error === "string" ? <p role="alert" className="mt-4 text-sm text-tone-danger-fg">{error}</p> : null}
        {saved === "1" ? <p role="status" className="mt-4 text-sm text-tone-success-fg">Saved.</p> : null}

        {!draft ? (
          <EmptyState className="mt-8" title="Not available" description="Sign in again and reload the page." />
        ) : (
          <>
            <section aria-labelledby="support-heading" className="mt-8">
              <h2 id="support-heading" className="text-base font-semibold text-foreground">
                1. Your support (private)
              </h2>
              {draft.support.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Nothing listed yet.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {draft.support.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border-default px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{s.title}</p>
                        <p className="text-muted-foreground">
                          {SUPPORT_STATUSES.find((x) => x.key === s.status)?.label} · {SUPPORT_KINDS.find((x) => x.key === s.kind)?.label}
                          {s.funder ? ` · ${s.funder}` : ""}
                          {s.role ? ` · ${s.role}` : ""}
                          {s.startYear ? ` · ${s.startYear}${s.endYear ? `–${s.endYear}` : "–"}` : ""}
                          {s.effortMonths !== null ? ` · ${s.effortMonths} person months/year` : ""}
                        </p>
                      </div>
                      <form action={deleteSupportItemAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-medium text-foreground">Add a grant, proposal or support</summary>
                <form action={saveSupportItemAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span>Title</span>
                    <input name="title" required minLength={3} maxLength={300} className={field} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Funder or source</span>
                    <input name="funder" maxLength={200} placeholder="e.g. NSF, CNPq, FAPEAM" className={field} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Your role</span>
                    <input name="role" maxLength={120} placeholder="e.g. PI, co-PI, key personnel" className={field} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Kind</span>
                    <select name="kind" className={field} defaultValue="grant">
                      {SUPPORT_KINDS.map((k) => (
                        <option key={k.key} value={k.key}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Status</span>
                    <select name="status" className={field} defaultValue="current">
                      {SUPPORT_STATUSES.map((k) => (
                        <option key={k.key} value={k.key}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Start year</span>
                    <input name="startYear" inputMode="numeric" pattern="\d{4}" className={field} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>End year</span>
                    <input name="endYear" inputMode="numeric" pattern="\d{4}" className={field} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Person months per year</span>
                    <input name="effortMonths" inputMode="decimal" placeholder="e.g. 1.5" className={field} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Amount (as you want it written)</span>
                    <input name="amountNote" maxLength={200} placeholder="e.g. US$ 450,000 total" className={field} />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span>Overlap with other projects (optional)</span>
                    <textarea name="overlapNote" maxLength={1000} rows={2} className={field} />
                  </label>
                  <div className="sm:col-span-2">
                    <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
                  </div>
                </form>
              </details>
            </section>

            <section aria-labelledby="ties-heading" className="mt-10">
              <h2 id="ties-heading" className="text-base font-semibold text-foreground">
                2. Your ties, from the record
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {draft.personId
                  ? "Advisors and advisees are lifelong on the NSF form; co-authors and collaborators count for the last 48 months. Anything missing? Propose it on your page, with its source."
                  : "Your account is not linked to a person in the record yet, so only your own list appears. Find your record from the Member page."}
              </p>
              {draft.personId ? (
                <>
                  <PeopleTable title="Advisors" people={draft.advisors} when={span} />
                  <PeopleTable title="Advisees" people={draft.advisees} when={span} />
                  <PeopleTable title="Co-authors, last 48 months" people={draft.coauthors} when={(p) => `${p.works ?? 0} shared, last in ${p.lastYear ?? "?"}`} />
                  <PeopleTable title="Collaborators, last 48 months" people={draft.collaborators} when={(p) => `${p.kind ?? "Collaboration"}, ${span(p)}`} />
                  {coaRows(draft).length > 0 ? (
                    <p className="mt-4 text-sm">
                      <Link href="/workspace/support/coa" prefetch={false} className="underline underline-offset-2">
                        Download these people as a spreadsheet (CSV) for the NSF COA template
                      </Link>
                    </p>
                  ) : null}
                </>
              ) : null}
            </section>

            <section aria-labelledby="draft-heading" className="mt-10">
              <h2 id="draft-heading" className="text-base font-semibold text-foreground">
                3. Other Support draft
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Copy it into the funder&apos;s form and check each line.</p>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md border border-border-default bg-surface px-4 py-3 text-xs">
                {otherSupportText(draft)}
              </pre>
            </section>
          </>
        )}
      </Container>
    </main>
  );
}
