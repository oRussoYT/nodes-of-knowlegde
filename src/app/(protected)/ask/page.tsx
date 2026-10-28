import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { pageTitle } from "@/config/site";
import { MODES, citedNumbers, pieces, type Mode } from "@/features/librarian/parse";
import { askLibrarian, claudeIsOn, findSources } from "@/features/librarian/read";

// The AI librarian (ROTEIRO fase 2, etapa K): questions answered only from
// the record, every statement with its numbered source. Summaries,
// comparisons, a version for a class, and what is missing for archivists.
// Without AI, the sources themselves are shown.
export const metadata: Metadata = {
  title: pageTitle("Ask the record"),
};

export const dynamic = "force-dynamic";

const TYPE_LABEL = { person: "Person", institution: "Institution", work: "Work", history: "History" } as const;

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q.trim().slice(0, 500) : "";
  const mode: Mode = MODES.some((m) => m.key === raw.mode) ? (raw.mode as Mode) : "answer";
  const sources = q ? await findSources(q) : [];
  const answer = q ? await askLibrarian(q, mode, sources) : null;
  const paras = answer ? pieces(answer, sources.length) : [];
  const cited = new Set(citedNumbers(paras));
  const aiOn = claudeIsOn();

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Ask the record"
          description="Ask about people, institutions, works and the history kept here. The answer uses only the record, and every statement shows its source."
        />

        <form method="get" className="mt-8 grid gap-3 rounded-md border border-border-default px-4 py-4 sm:grid-cols-[1fr_12rem]">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="ask-q">Your question</Label>
            <Textarea id="ask-q" name="q" rows={2} defaultValue={q} maxLength={500} placeholder={MODES.find((m) => m.key === mode)?.hint} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ask-mode">What you need</Label>
            <Select id="ask-mode" name="mode" defaultValue={mode}>
              {MODES.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" fullWidth>
              Ask
            </Button>
          </div>
        </form>
        {!aiOn ? <p className="mt-2 text-xs text-muted-foreground">The AI is not switched on yet: you will see the sources the record holds for your question.</p> : null}

        {q === "" ? null : sources.length === 0 ? (
          <EmptyState className="mt-8" title="The record holds nothing on that yet" description="Try other words — a name, an institution, a place, a species." />
        ) : (
          <>
            {paras.length > 0 ? (
              <section aria-labelledby="answer-heading" className="mt-10">
                <h2 id="answer-heading" className="text-lg font-semibold text-foreground">
                  Answer
                </h2>
                <div className="mt-3 space-y-4 text-[17px] leading-relaxed text-foreground">
                  {paras.map((p, i) => (
                    <p key={i}>
                      {p.map((x, j) =>
                        "text" in x ? (
                          <span key={j}>{x.text}</span>
                        ) : (
                          <a key={j} href={`#source-${x.cite}`} className="align-super text-xs font-semibold text-accent no-underline">
                            [{x.cite}]
                          </a>
                        ),
                      )}
                    </p>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Written by AI from the sources below. Check each source; the record itself is the authority.</p>
              </section>
            ) : null}

            <section aria-labelledby="sources-heading" className="mt-10">
              <h2 id="sources-heading" className="text-lg font-semibold text-foreground">
                Sources in the record ({sources.length})
              </h2>
              <ol className="mt-3 flex flex-col gap-2 text-sm">
                {sources.map((s) => (
                  <li key={s.n} id={`source-${s.n}`} className={`rounded-md border px-4 py-3 ${cited.has(s.n) ? "border-accent" : "border-border-default"}`}>
                    <p>
                      <span className="mr-2 font-semibold text-muted-foreground">[{s.n}]</span>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{TYPE_LABEL[s.type]}</span>{" "}
                      <Link href={s.url} className="font-medium text-foreground underline underline-offset-2">
                        {s.title}
                      </Link>
                    </p>
                    <p className="mt-1 text-muted-foreground">{s.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </Container>
    </main>
  );
}
