import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import { stewardSetPublicAction } from "../actions";

// Steward-only control on a person page: publish (with a written reason) or
// unpublish the public page. Rendered only for reviewers; the database checks
// again. Plain form, no client JavaScript.
export function PublishControl({
  personId,
  isPublic,
  error,
}: {
  personId: string;
  isPublic: boolean;
  error: string | null;
}) {
  return (
    <section aria-labelledby="publish-heading" className="mt-8 rounded-md border border-border-default px-4 py-4">
      <h2 id="publish-heading" className="text-sm font-medium text-foreground">
        Public page {isPublic ? "· published" : "· not published"}
      </h2>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {isPublic ? (
        <form action={stewardSetPublicAction} className="mt-3 flex flex-wrap items-center gap-3">
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="makePublic" value="false" />
          <Link href={`/p/${personId}`} className="text-sm underline underline-offset-2">
            Open the public page
          </Link>
          <Button type="submit" size="sm" emphasis="secondary">
            Unpublish
          </Button>
        </form>
      ) : (
        <form action={stewardSetPublicAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="makePublic" value="true" />
          <Label htmlFor="publish-reason">Why this page should be public</Label>
          <Input
            id="publish-reason"
            name="reason"
            required
            placeholder="e.g. Well-documented historical figure; published records only."
          />
          <p className="text-xs text-muted-foreground">
            Pages are never public by default. This decision is recorded with your name and reason.
          </p>
          <div>
            <Button type="submit" size="sm">
              Publish
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
