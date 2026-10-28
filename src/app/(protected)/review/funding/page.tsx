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
import { closeCallAction, importGrantsGovAction, readCallPageAction, saveCallAction } from "@/features/funding/actions";
import { CallCard } from "@/features/funding/CallCard";
import { getNodeFundingMatches, listCalls } from "@/features/funding/read";
import { claudeIsOn } from "@/lib/ai/claude";

export const metadata: Metadata = {
  title: pageTitle("Manage calls"),
};

export default async function ManageFundingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const error = typeof raw.error === "string" ? raw.error : null;
  const [calls, nodeMatches] = await Promise.all([listCalls(null), getNodeFundingMatches("pdbff")]);
  const aiOn = claudeIsOn();
  const ok =
    raw.saved === "1" ? "Call saved." : typeof raw.imported === "string" ? `${raw.imported} calls imported from Grants.gov.` : raw.read === "1" ? "The AI read the call; check it below." : null;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Manage calls"
          description="Add calls by hand, import them from Grants.gov, or let AI read a call's page. Members see the ones that match their record, with why."
          action={
            <Link href="/funding" className="text-sm underline underline-offset-2">
              Calls and grants
            </Link>
          }
        />
        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        {ok ? (
          <Alert tone="success" className="mt-6">
            {ok}
          </Alert>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <form action={importGrantsGovAction} className="flex flex-col gap-3 rounded-md border border-border-default px-4 py-4">
            <Label htmlFor="gg-theme">Import from Grants.gov — theme</Label>
            <Input id="gg-theme" name="theme" required placeholder="e.g. tropical forest" />
            <Button type="submit" emphasis="secondary" size="sm">
              Search and import
            </Button>
          </form>
          <form action={readCallPageAction} className="flex flex-col gap-3 rounded-md border border-border-default px-4 py-4">
            <Label htmlFor="ai-url">Let AI read a call&apos;s page</Label>
            <Input id="ai-url" name="url" required placeholder="https://…" disabled={!aiOn} />
            <Button type="submit" emphasis="secondary" size="sm" disabled={!aiOn}>
              {aiOn ? "Read the call" : "AI is not switched on yet"}
            </Button>
          </form>
        </div>

        <form action={saveCallAction} className="mt-6 grid gap-4 rounded-md border border-border-default px-4 py-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold text-foreground sm:col-span-2">Add a call by hand</h2>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="c-title">Title</Label>
            <Input id="c-title" name="title" required maxLength={400} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-funder">Funder</Label>
            <Input id="c-funder" name="funder" required placeholder="e.g. CNPq, FAPEAM, NSF, ERC" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-url">Page of the call</Label>
            <Input id="c-url" name="url" required placeholder="https://" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-opens">Opens (YYYY-MM-DD)</Label>
            <Input id="c-opens" name="opensOn" type="date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-closes">Deadline (YYYY-MM-DD)</Label>
            <Input id="c-closes" name="closesOn" type="date" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="c-themes">Themes it funds (comma or one per line)</Label>
            <Textarea id="c-themes" name="themes" rows={2} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-countries">Eligible countries (two letters; empty = any)</Label>
            <Input id="c-countries" name="eligibleCountries" placeholder="BR" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-scope">Scope</Label>
            <Select id="c-scope" name="scope" defaultValue="national">
              <option value="national">National</option>
              <option value="international">International</option>
            </Select>
          </div>
          <fieldset className="flex flex-wrap gap-4 text-sm sm:col-span-2">
            <legend className="mb-1 text-sm font-medium text-foreground">For whom</legend>
            {[
              ["student", "Students"],
              ["early_career", "Early career"],
              ["established", "Established"],
              ["any", "Any"],
            ].map(([v, l]) => (
              <label key={v} className="flex items-center gap-2">
                <input type="checkbox" name="careerStages" value={v} /> {l}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-amount">Amount (optional)</Label>
            <Input id="c-amount" name="amount" placeholder="e.g. up to R$ 200,000" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="c-summary">Summary (optional)</Label>
            <Textarea id="c-summary" name="summary" rows={3} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Save call</Button>
          </div>
        </form>

        {nodeMatches && nodeMatches.length > 0 ? (
          <section aria-labelledby="node-heading" className="mt-12">
            <h2 id="node-heading" className="text-lg font-semibold text-foreground">
              For the PDBFF group
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Calls on themes people of the Node work on (how many people, never who).</p>
            <ul className="mt-3 flex flex-col gap-3">
              {nodeMatches.map((c) => (
                <CallCard key={c.id} call={c} />
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="open-heading" className="mt-12">
          <h2 id="open-heading" className="text-lg font-semibold text-foreground">
            Open calls ({calls.length})
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {calls.map((c) => (
              <CallCard key={c.id} call={c}>
                <form action={closeCallAction} className="mt-2">
                  <input type="hidden" name="callId" value={c.id} />
                  <Button type="submit" size="sm" emphasis="ghost">
                    Withdraw
                  </Button>
                </form>
              </CallCard>
            ))}
          </ul>
        </section>
      </Container>
    </main>
  );
}
