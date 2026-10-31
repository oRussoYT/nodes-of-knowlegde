import { buttonVariants } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";

import { decideInterpretationAction, hideInterpretationAction, withdrawInterpretationAction, writeInterpretationAction } from "./actions";
import { interpretationStatusLabel, visibleInterpretations, type Interpretation } from "./parse";

// Signed interpretations, shown apart from the facts: each one carries its
// author's name and is labelled as a reading, not as the record.
export function Interpretations({
  subjectType,
  subjectId,
  subjectName,
  items,
  returnTo,
  notice,
  error,
}: {
  subjectType: "person" | "contribution";
  subjectId: string;
  subjectName: string;
  items: Interpretation[];
  returnTo: string;
  notice: string | null;
  error: string | null;
}) {
  const shown = visibleInterpretations(items);
  return (
    <section id="interpretations" aria-labelledby="interpretations-heading" className="mt-8 rounded-2xl border border-border-default px-5 py-4">
      <h2 id="interpretations-heading" className="text-sm font-semibold text-foreground">
        Interpretations
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed readings of the record by people who know it. They are opinions with a name, not facts — the facts stay in
        the sections below, each with its source.
      </p>

      {shown.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-4">
          {shown.map((i) => (
            <li key={i.id} className="border-l-2 border-border-default pl-4 text-sm">
              <blockquote className="whitespace-pre-line text-foreground">{i.body}</blockquote>
              <p className="mt-1 text-muted-foreground">
                — {i.author}
                {i.createdAt ? `, ${i.createdAt.slice(0, 10)}` : ""}
                {i.status !== "published" ? ` · ${interpretationStatusLabel(i.status)}` : ""}
              </p>
              {i.sources ? <p className="mt-1 text-xs text-muted-foreground">Based on: {i.sources}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {i.canDecide ? (
                  <>
                    <form action={decideInterpretationAction}>
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="decision" value="publish" />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button type="submit" className={buttonVariants({ emphasis: "primary", size: "sm" })}>Publish</button>
                    </form>
                    <form action={decideInterpretationAction}>
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="decision" value="decline" />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>Do not publish</button>
                    </form>
                  </>
                ) : null}
                {i.isMine && (i.status === "proposed" || i.status === "published") ? (
                  <form action={withdrawInterpretationAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>Withdraw mine</button>
                  </form>
                ) : null}
                {i.canHide ? (
                  <form action={hideInterpretationAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>Hide from my page</button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No interpretation yet.</p>
      )}

      {notice ? <p role="status" className="mt-3 text-sm text-tone-success-fg">{notice}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-tone-danger-fg">{error}</p> : null}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-foreground">Write a signed interpretation about {subjectName}</summary>
        <form action={writeInterpretationAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="subjectType" value={subjectType} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="flex flex-col gap-1">
            <span>Your reading</span>
            <textarea name="body" required minLength={20} maxLength={4000} rows={5} className="rounded-md border border-border-default bg-surface px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span>What it is based on (optional)</span>
            <input name="sources" maxLength={1000} placeholder="e.g. worked with her 1995–2002; interview of 2019" className="rounded-md border border-border-default bg-surface px-3 py-2" />
          </label>
          <p className="text-xs text-muted-foreground">
            It carries your name. A steward reads it before it appears, and {subjectName} can always hide it from their page.
          </p>
          <div>
            <SubmitButton pendingLabel="Sending…">Send for review</SubmitButton>
          </div>
        </form>
      </details>
    </section>
  );
}
