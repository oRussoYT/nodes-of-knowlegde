import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { pageTitle } from "@/config/site";
import { addTopicsAction, decideTopicAction, suggestTopicsAction } from "@/features/connections/actions";
import { TOPIC_KINDS, reasonSentence } from "@/features/connections/parse";
import { getMyConnections } from "@/features/connections/read";
import { claudeIsOn } from "@/lib/ai/claude";

// Connections (ROTEIRO fase 2, etapa I): people with the same themes,
// methods, organisms and places -- inside and outside your institutions.
// Each says why; nobody is ranked. Topics suggested by AI wait for you.
export const metadata: Metadata = {
  title: pageTitle("Connections"),
};

const SOURCE: Record<string, string> = { person: "said by you", ai: "suggested by AI", openalex: "from OpenAlex", steward: "added by a steward" };

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const doc = await getMyConnections();
  const error = typeof raw.error === "string" ? raw.error : null;
  const aiOn = claudeIsOn();
  const proposed = doc.topics.filter((t) => t.status === "proposed");
  const confirmed = doc.topics.filter((t) => t.status === "confirmed");
  const inside = doc.connections.filter((c) => c.inside);
  const outside = doc.connections.filter((c) => !c.inside);

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Connections"
          description="Say what you work on — themes, methods, organisms, places — and meet the people in the record who work on the same, at your institutions and beyond. Each connection says why."
          action={
            <Link href="/member/suggestions" className="text-sm underline underline-offset-2">
              People you may know
            </Link>
          }
        />
        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        {typeof raw.suggested === "string" ? (
          <Alert tone="success" className="mt-6">
            The AI suggested {raw.suggested} topics. Confirm the ones that are right — only confirmed topics connect you.
          </Alert>
        ) : null}

        {!doc.linked ? (
          <EmptyState
            className="mt-8"
            title="Connect your account to your record first"
            description="Connections come from your own record."
            action={
              <Link href="/member/claim" className="text-sm underline underline-offset-2">
                Find your record
              </Link>
            }
          />
        ) : (
          <>
            <section aria-labelledby="topics-heading" className="mt-10">
              <h2 id="topics-heading" className="text-lg font-semibold text-foreground">
                What you work on
              </h2>
              {confirmed.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Nothing yet.</p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {confirmed.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 rounded-full border border-border-default px-3 py-1 text-sm">
                      <span className="text-muted-foreground">{TOPIC_KINDS.find((k) => k.key === t.kind)?.label}:</span> {t.label}
                      <form action={decideTopicAction}>
                        <input type="hidden" name="topicId" value={t.id} />
                        <button type="submit" name="decision" value="remove" aria-label={`Remove ${t.label}`} className="text-muted-foreground">
                          ×
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              {proposed.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-foreground">Suggested — waiting for you</h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {proposed.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border-default px-3 py-2 text-sm">
                        <span>
                          <Badge size="sm" tone="info">
                            {SOURCE[t.source]}
                          </Badge>{" "}
                          {TOPIC_KINDS.find((k) => k.key === t.kind)?.label}: <strong>{t.label}</strong>
                          {t.reason ? <span className="block text-xs text-muted-foreground">Why: {t.reason}</span> : null}
                        </span>
                        <form action={decideTopicAction} className="flex gap-2">
                          <input type="hidden" name="topicId" value={t.id} />
                          <Button type="submit" name="decision" value="confirm" size="sm">
                            Yes, I work on this
                          </Button>
                          <Button type="submit" name="decision" value="reject" size="sm" emphasis="secondary">
                            No
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <form action={addTopicsAction} className="mt-6 grid gap-3 rounded-md border border-border-default px-4 py-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="topic-kind">Kind</Label>
                  <Select id="topic-kind" name="kind" defaultValue="theme">
                    {TOPIC_KINDS.map((k) => (
                      <option key={k.key} value={k.key}>
                        {k.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="topic-labels">Topics (one per line or separated by commas)</Label>
                  <Textarea id="topic-labels" name="labels" rows={2} placeholder="e.g. forest fragmentation, edge effects" />
                </div>
                <Button type="submit">Add</Button>
              </form>
              {aiOn ? (
                <form action={suggestTopicsAction} className="mt-3">
                  <Button type="submit" emphasis="secondary" size="sm">
                    Suggest topics from my works (AI)
                  </Button>
                </form>
              ) : null}
            </section>

            {[
              { id: "inside", title: "At your institutions", list: inside, empty: "No one at your institutions shares your topics yet." },
              { id: "outside", title: "Beyond your institutions", list: outside, empty: "No one elsewhere in the record shares your topics yet." },
            ].map((g) => (
              <section key={g.id} aria-labelledby={`${g.id}-heading`} className="mt-12">
                <h2 id={`${g.id}-heading`} className="text-lg font-semibold text-foreground">
                  {g.title}
                </h2>
                {g.list.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{confirmed.length === 0 ? "Add what you work on to see connections." : g.empty}</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {g.list.map((c) => (
                      <li key={c.personId} className="rounded-md border border-border-default px-4 py-3 text-sm">
                        <Link href={`/people/${c.personId}`} className="font-medium text-foreground underline underline-offset-2">
                          {c.displayName}
                        </Link>
                        <p className="mt-1 text-muted-foreground">{reasonSentence(c.shared)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            {confirmed.length > 0 ? (
              <p className="mt-10 text-sm text-muted-foreground">
                Outside the record:{" "}
                {confirmed.slice(0, 3).map((t, i) => (
                  <span key={t.id}>
                    {i > 0 ? " · " : ""}
                    <a href={`https://openalex.org/authors?search=${encodeURIComponent(t.label)}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                      researchers on “{t.label}” in OpenAlex
                    </a>
                  </span>
                ))}
              </p>
            ) : null}
          </>
        )}
      </Container>
    </main>
  );
}
