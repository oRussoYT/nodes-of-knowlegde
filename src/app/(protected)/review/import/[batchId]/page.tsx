import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { listConfirmationLinks } from "@/features/confirm/read";
import { createConfirmationLinksAction } from "@/features/confirm/steward";
import { decideExternalMatchAction, lookUpBatchInOpenAlexAction, undoExternalMatchAction } from "@/features/external/actions";
import { getSiteUrl } from "@/lib/supabase/env";
import { REASON_LABELS, type ExternalReason } from "@/features/external/openalex";
import { bringInBatchHistoryAction } from "@/features/external/history-actions";
import { getExternalBatch } from "@/features/external/read";
import { resolveImportRowAction } from "@/features/import/actions";
import { getImportCandidates, listImportBatches } from "@/features/import/read";
import type { MatchReason } from "@/features/import/types";

// One uploaded list, row by row (docs/ROTEIRO.md etapa 4). The system only
// proposes; the steward decides. Each candidate carries the reason it was
// proposed -- an explanation, not a score -- and whether the record already
// documents that person at the importing institution.
export const metadata: Metadata = {
  title: pageTitle("Review an imported list"),
};

const REASON_LABEL: Record<MatchReason, string> = {
  same_name: "Same name",
  same_family_initial: "Same family name and initial",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ImportBatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { batchId } = await params;
  const { error, notice } = await searchParams;
  if (!UUID.test(batchId)) notFound();

  const [doc, batches, external, links] = await Promise.all([
    getImportCandidates(batchId),
    listImportBatches(),
    getExternalBatch(batchId),
    listConfirmationLinks(batchId),
  ]);
  const matchedPeople = external
    ? [
        ...new Set(
          external.rows
            .filter((r) => r.personId && r.matches.some((m) => m.status === "accepted"))
            .map((r) => r.personId as string),
        ),
      ]
    : [];

  const site = getSiteUrl().replace(/\/$/, "");
  const ANSWER: Record<string, string> = { confirmed: "Confirmed", corrected: "Sent a correction", declined: "Asked not to be listed" };
  const summary = batches.find((b) => b.id === batchId);
  if (!doc || !summary) notFound();

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <Link href="/review/import" className="text-sm text-muted-foreground underline underline-offset-2">
          ← All lists
        </Link>

        <div className="mt-6">
          <PageHeader
            title={summary.label}
            description={`${summary.organizationName ?? "No institution"} · ${summary.total} people · ${summary.pending} waiting · ${summary.matched} matched · ${summary.created} new · ${summary.skipped} skipped`}
          />
        </div>

        {typeof error === "string" ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        {typeof notice === "string" ? (
          <Alert tone="info" className="mt-6">
            {notice}
          </Alert>
        ) : null}

        {doc.rows.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Every row in this list has been decided.</p>
        ) : (
          <ol className="mt-8 flex flex-col gap-4">
            {doc.rows.map((row) => {
              const details = [row.degree, row.programme, row.graduationYear ? String(row.graduationYear) : null, row.externalRef]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={row.id} className="rounded-md border border-border-default px-4 py-4">
                  <p className="text-xs text-muted-foreground">Line {row.rowNumber + 1}</p>
                  <h2 className="text-base font-semibold text-foreground">
                    {row.givenName} {row.familyName}
                  </h2>
                  {details ? <p className="text-sm text-muted-foreground">{details}</p> : null}

                  {row.candidates.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Already in the record — is it one of these?
                      </p>
                      <ul className="mt-2 flex flex-col gap-2">
                        {row.candidates.map((c) => (
                          <li key={c.personId} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-3 py-2">
                            <span className="text-sm">
                              <Link href={`/people/${c.personId}`} className="underline underline-offset-2">
                                {c.displayName}
                              </Link>{" "}
                              <Badge size="sm" tone="neutral">
                                {REASON_LABEL[c.reason]}
                              </Badge>{" "}
                              {c.documentedAtInstitution ? (
                                <Badge size="sm" tone="info">
                                  Already documented at this institution
                                </Badge>
                              ) : null}{" "}
                              {c.isDemo ? (
                                <Badge size="sm" tone="warning">
                                  Demonstration record
                                </Badge>
                              ) : null}
                            </span>
                            <form action={resolveImportRowAction}>
                              <input type="hidden" name="batchId" value={batchId} />
                              <input type="hidden" name="rowId" value={row.id} />
                              <input type="hidden" name="decision" value="match" />
                              <input type="hidden" name="personId" value={c.personId} />
                              <Button type="submit" size="sm" emphasis="secondary">
                                Same person
                              </Button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">No one in the record looks like this person.</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={resolveImportRowAction}>
                      <input type="hidden" name="batchId" value={batchId} />
                      <input type="hidden" name="rowId" value={row.id} />
                      <input type="hidden" name="decision" value="create" />
                      <Button type="submit" size="sm">
                        New person
                      </Button>
                    </form>
                    <form action={resolveImportRowAction}>
                      <input type="hidden" name="batchId" value={batchId} />
                      <input type="hidden" name="rowId" value={row.id} />
                      <input type="hidden" name="decision" value="skip" />
                      <Button type="submit" size="sm" emphasis="ghost">
                        Skip
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <section aria-labelledby="where-heading" className="mt-14 border-t border-border-default pt-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="where-heading" className="text-base font-semibold text-foreground">
                Where they went
              </h2>
              <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                Look each graduate up in OpenAlex, the open index of researchers and their institutions. Each match comes
                with the reasons it was proposed. Accepting one records their OpenAlex and ORCID identifiers and their latest
                known institution — only after you decide who the row is.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={lookUpBatchInOpenAlexAction}>
                <input type="hidden" name="batchId" value={batchId} />
                <Button type="submit" size="sm" emphasis="secondary">
                  Look up in OpenAlex
                </Button>
              </form>
              {matchedPeople.length > 0 ? (
                <form action={bringInBatchHistoryAction}>
                  <input type="hidden" name="batchId" value={batchId} />
                  {matchedPeople.map((id) => (
                    <input key={id} type="hidden" name="personId" value={id} />
                  ))}
                  <Button type="submit" size="sm">
                    Bring in their history ({matchedPeople.length})
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
          {matchedPeople.length > 0 ? (
            <p className="mt-3 max-w-prose text-sm text-muted-foreground">
              <strong className="font-medium text-foreground">Bring in their history</strong> adds, for everyone with an
              accepted match, the institutions they were affiliated with over the years (including closed or renamed ones,
              from ROR) and their theses, articles and datasets — all provisional, each with its public link.
            </p>
          ) : null}

          {external && external.rows.some((r) => r.matches.length > 0) ? (
            <ul className="mt-6 flex flex-col gap-4">
              {external.rows
                .filter((r) => r.matches.length > 0)
                .map((r) => (
                  <li key={r.id} className="rounded-md border border-border-default px-4 py-4">
                    <p className="text-sm font-semibold text-foreground">
                      {r.givenName} {r.familyName}
                      <span className="font-normal text-muted-foreground">
                        {r.graduationYear ? ` · graduated ${r.graduationYear}` : ""} ·{" "}
                        {r.status === "pending" ? "row not decided yet" : r.status === "skipped" ? "skipped" : "in the record"}
                      </span>
                    </p>
                    <ul className="mt-3 flex flex-col gap-2">
                      {r.matches.map((m) => (
                        <li key={m.id} className="rounded-md bg-surface px-3 py-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              <a href={m.externalId} className="font-medium underline underline-offset-2" target="_blank" rel="noreferrer">
                                {m.displayName}
                              </a>
                              {m.orcid ? <span className="text-muted-foreground"> · ORCID</span> : null}
                              {m.lastKnownInstitution ? (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · now at {m.lastKnownInstitution}
                                  {m.lastKnownCountry ? ` (${m.lastKnownCountry})` : ""}
                                </span>
                              ) : null}
                            </span>
                            {m.status === "proposed" ? (
                              <span className="flex gap-2">
                                <form action={decideExternalMatchAction}>
                                  <input type="hidden" name="batchId" value={batchId} />
                                  <input type="hidden" name="matchId" value={m.id} />
                                  <input type="hidden" name="accept" value="true" />
                                  <Button type="submit" size="sm">
                                    This is them
                                  </Button>
                                </form>
                                <form action={decideExternalMatchAction}>
                                  <input type="hidden" name="batchId" value={batchId} />
                                  <input type="hidden" name="matchId" value={m.id} />
                                  <input type="hidden" name="accept" value="false" />
                                  <Button type="submit" size="sm" emphasis="ghost">
                                    Not them
                                  </Button>
                                </form>
                              </span>
                            ) : (
                              <Badge size="sm" tone={m.status === "accepted" ? "success" : "neutral"}>
                                {m.status === "accepted" ? "Accepted" : "Set aside"}
                              </Badge>
                            )}
                          </div>
                          {m.status === "accepted" ? (
                            <details className="mt-2 text-xs">
                              <summary className="cursor-pointer text-muted-foreground underline underline-offset-2">
                                Wrong person? Undo
                              </summary>
                              <form action={undoExternalMatchAction} className="mt-2 flex flex-wrap items-end gap-2">
                                <input type="hidden" name="batchId" value={batchId} />
                                <input type="hidden" name="matchId" value={m.id} />
                                <label className="flex min-w-56 flex-1 flex-col gap-1">
                                  <span className="text-muted-foreground">Why it was wrong</span>
                                  <input
                                    name="reason"
                                    required
                                    placeholder="e.g. a homonym in another field"
                                    className="rounded-md border border-border-default bg-background px-2 py-1.5 text-sm"
                                  />
                                </label>
                                <Button type="submit" size="sm" emphasis="secondary">
                                  Undo this match
                                </Button>
                              </form>
                            </details>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {m.reasons.map((reason) => (
                              <Badge key={reason} size="sm" tone="info">
                                {REASON_LABELS[reason as ExternalReason] ?? reason}
                              </Badge>
                            ))}
                          </div>
                          {m.affiliations.length > 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {m.affiliations
                                .slice(0, 4)
                                .map((a) =>
                                  a.years.length ? `${a.institution} (${a.years[0]}–${a.years[a.years.length - 1]})` : a.institution,
                                )
                                .join(" · ")}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">No lookups yet.</p>
          )}
        </section>
        <section aria-labelledby="confirm-heading" className="mt-14 border-t border-border-default pt-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="confirm-heading" className="text-base font-semibold text-foreground">
                Ask graduates to confirm
              </h2>
              <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                Each graduate gets a private link. They see what the record says about them and answer: this is right,
                something is wrong, or please don&apos;t list me. Send the links the way you already reach your alumni.
                Links work once and expire after 90 days.
              </p>
            </div>
            <form action={createConfirmationLinksAction}>
              <input type="hidden" name="batchId" value={batchId} />
              <Button type="submit" size="sm" emphasis="secondary">
                Create links
              </Button>
            </form>
          </div>
          {links.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No links yet. Decide the rows first, then create links.</p>
          ) : (
            <ul className="mt-6 flex flex-col gap-2">
              {links.map((l) => (
                <li key={l.id} className="rounded-md border border-border-default px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{l.displayName}</span>
                    {l.response ? (
                      <Badge size="sm" tone={l.response === "confirmed" ? "success" : l.response === "declined" ? "neutral" : "warning"}>
                        {ANSWER[l.response] ?? l.response}
                      </Badge>
                    ) : (
                      <Badge size="sm" tone="neutral">
                        Waiting
                      </Badge>
                    )}
                  </div>
                  {!l.response ? (
                    <input
                      readOnly
                      aria-label={`Confirmation link for ${l.displayName}`}
                      value={`${site}/confirm/${l.token}`}
                      className="mt-2 w-full rounded-md border border-border-default bg-surface px-2 py-1 font-mono text-xs"
                    />
                  ) : null}
                  {l.note ? <p className="mt-2 text-sm text-muted-foreground">&ldquo;{l.note}&rdquo;</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </main>
  );
}
