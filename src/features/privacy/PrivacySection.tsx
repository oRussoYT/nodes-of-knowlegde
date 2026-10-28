import { Button } from "@/components/ui/Button";

import { setMyPrivacyAction } from "./actions";

// Consent over what the record reveals about you (ROTEIRO fase 2, etapa M).
export function PrivacySection({ linked, limitRevelations, saved, error }: { linked: boolean; limitRevelations: boolean; saved: boolean; error: string | null }) {
  return (
    <section id="privacy" aria-labelledby="privacy-heading" className="mt-10 rounded-2xl border border-border-default bg-surface px-6 py-6">
      <h2 id="privacy-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
        What the record reveals about you
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        The record keeps its documented sources either way. You can ask that your page not highlight what it reveals about you — cohorts,
        descendants, recurrences — and that you stay out of suggestions, connections and the librarian&apos;s answers.
      </p>
      {!linked ? (
        <p className="mt-3 text-sm text-muted-foreground">Link your account to your person record to choose this.</p>
      ) : (
        <form action={setMyPrivacyAction} className="mt-4 flex flex-col gap-3">
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input type="checkbox" name="limitRevelations" defaultChecked={limitRevelations} className="mt-0.5 size-4" />
            Limit what the record reveals about me
          </label>
          <div>
            <Button type="submit" emphasis="secondary" size="sm">
              Save my choice
            </Button>
          </div>
          {saved ? <p className="text-sm text-foreground">Saved.</p> : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
