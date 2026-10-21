import type { Metadata } from "next";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { pageTitle } from "@/config/site";
import { respondConfirmationAction } from "@/features/confirm/actions";
import { isPlausibleToken, parseConfirmation } from "@/features/confirm/parse";
import { createClient } from "@/lib/supabase/server";

// A graduate confirms, corrects, or declines their record (ROTEIRO etapa 6).
// Opened from a private link the institution sent; no account needed. Shows
// only what the record says about this one person.
export const metadata: Metadata = {
  title: pageTitle("Confirm your record"),
  robots: { index: false, follow: false },
};

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await params;
  const { error, done } = await searchParams;
  const supabase = await createClient();
  const view = isPlausibleToken(token)
    ? parseConfirmation((await supabase.rpc("get_confirmation", { p_token: token })).data)
    : null;

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 py-16">
      <Container width="content">
        {!view ? (
          <>
            <h1 className="text-2xl font-semibold text-foreground">This link is not valid</h1>
            <p className="mt-3 text-sm text-muted-foreground">It may have expired or been typed incorrectly. Ask the institution that sent it for a new one.</p>
          </>
        ) : view.answered || done === "1" ? (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Thank you, {view.displayName}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {view.response === "declined"
                ? "We will not list you. Your page is not public."
                : view.response === "corrected"
                  ? "We received your correction. A steward will review it."
                  : "Your answer has been recorded."}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Is this right?</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">{view.displayName}</h1>
            {typeof error === "string" ? (
              <Alert tone="danger" className="mt-4">
                {error}
              </Alert>
            ) : null}
            <dl className="mt-6 grid gap-3 rounded-md border border-border-default px-4 py-4 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
              <dt className="text-muted-foreground">Studied at</dt>
              <dd>{view.institution ?? "—"}</dd>
              <dt className="text-muted-foreground">Degree and programme</dt>
              <dd>{[view.degree, view.programme].filter(Boolean).join(" · ") || "—"}</dd>
              <dt className="text-muted-foreground">Graduated</dt>
              <dd>{view.graduationYear ?? "—"}</dd>
              <dt className="text-muted-foreground">Latest known place</dt>
              <dd>
                {view.destination
                  ? `${view.destination.institution}${view.destination.country ? ` (${view.destination.country})` : ""}${view.destination.asOfYear ? `, as of ${view.destination.asOfYear}` : ""}`
                  : "Not known yet"}
              </dd>
            </dl>

            <div className="mt-6 flex flex-col gap-6">
              <form action={respondConfirmationAction}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="response" value="confirmed" />
                <Button type="submit">Yes, this is right</Button>
              </form>

              <form action={respondConfirmationAction} className="flex flex-col gap-2 rounded-md border border-border-default px-4 py-4">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="response" value="corrected" />
                <Label htmlFor="note">Something is wrong</Label>
                <Textarea id="note" name="note" rows={3} maxLength={2000} placeholder="For example: I moved to another university in 2021." />
                <div>
                  <Button type="submit" emphasis="secondary">
                    Send the correction
                  </Button>
                </div>
              </form>

              <form action={respondConfirmationAction}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="response" value="declined" />
                <Button type="submit" emphasis="ghost">
                  Please don&apos;t list me
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">Your page stops being public right away, and you are left out of public counts.</p>
              </form>
            </div>
          </>
        )}
      </Container>
    </main>
  );
}
