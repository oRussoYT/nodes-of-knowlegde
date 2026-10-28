import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { pageTitle } from "@/config/site";
import { getInstitutionsIndex } from "@/features/directory/read";
import { getIdentityStatus } from "@/features/identity/status";
import { importLattesAction, importOrcidAction, proposeColleagueAction, proposePeriodAction } from "@/features/record-candidates/actions";
import { EvidenceUploader } from "@/features/record-candidates/components/EvidenceUploader";
import { PersonPicker } from "@/features/record-candidates/components/PersonPicker";
import { describeCandidate, ORIGIN_LABELS } from "@/features/record-candidates/parse";
import { getMyRecordCandidates, getMyUserId, getRecordOptions } from "@/features/record-candidates/read";

// How knowledge enters the record: a period of a history, someone worked
// with, files that document it, or a CV import (ORCID, Lattes). Every item is
// a PROPOSAL until a steward accepts it -- never a fact on arrival.
export const metadata: Metadata = {
  title: pageTitle("Add to the record"),
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS = {
  pending: { label: "Waiting for review", tone: "info" },
  accepted: { label: "Accepted — in the record", tone: "success" },
  rejected: { label: "Declined", tone: "neutral" },
} as const;

function YearsAndSource({ prefix, userId }: { prefix: string; userId: string }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefix}-start`}>From (year)</Label>
        <Input id={`${prefix}-start`} name="startYear" inputMode="numeric" pattern="\d{4}" placeholder="1991" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefix}-end`}>Until (year)</Label>
        <Input id={`${prefix}-end`} name="endYear" inputMode="numeric" pattern="\d{4}" placeholder="1994" />
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
        <input type="checkbox" name="isOngoing" /> Still ongoing
      </label>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${prefix}-summary`}>What happened (optional)</Label>
        <Textarea id={`${prefix}-summary`} name="summary" rows={3} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${prefix}-source`}>What documents it</Label>
        <Input id={`${prefix}-source`} name="sourceNote" required placeholder="e.g. Field roster 1991, page 3 · a photo · my own memory" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${prefix}-files`}>Files (optional — PDF, photo, scan; only you and stewards can open them)</Label>
        <EvidenceUploader userId={userId} inputId={`${prefix}-files`} />
      </div>
    </>
  );
}

export default async function AddToRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const error = typeof raw.error === "string" ? raw.error : null;
  const sent = raw.sent === "1";
  const imported = typeof raw.imported === "string" ? Number(raw.imported) : null;
  const aboutParam = typeof raw.about === "string" && UUID.test(raw.about) ? raw.about : null;
  const aboutNameParam = typeof raw.name === "string" ? raw.name.slice(0, 200) : null;

  const [identity, userId] = await Promise.all([getIdentityStatus(), getMyUserId()]);
  const myPersonId = identity.kind === "approved" ? identity.claim.personId : null;
  const aboutId = aboutParam ?? myPersonId;
  const aboutOther = aboutId !== null && aboutId !== myPersonId;

  if (!aboutId || !userId) {
    return (
      <main id="main-content" tabIndex={-1} className="py-16">
        <Container width="content">
          <PageHeader title="Add to the record" />
          <EmptyState
            className="mt-8"
            title="Link your account to your record first"
            description="Claim your person record from the Member area, or open someone's page and choose “Propose something about this person”."
          />
        </Container>
      </main>
    );
  }

  const [options, institutions, mine] = await Promise.all([getRecordOptions(), getInstitutionsIndex(), getMyRecordCandidates()]);
  const hidden = (
    <>
      <input type="hidden" name="aboutPersonId" value={aboutId} />
      {aboutOther ? <input type="hidden" name="returnAbout" value={aboutId} /> : null}
    </>
  );
  const whose = aboutOther ? (aboutNameParam ?? "this person") : "you";

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title={aboutOther ? `Propose something about ${aboutNameParam ?? "this person"}` : "Add to your history"}
          description="Each item is a proposal. A steward checks what documents it before it joins the record — and it is always shown as provisional until a human confirms it."
          action={
            <Link href="/member" className="text-sm underline underline-offset-2">
              Member area
            </Link>
          }
        />

        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        {sent ? (
          <Alert tone="success" className="mt-6">
            Sent. It waits for a steward and is not part of the record until they accept it.
          </Alert>
        ) : null}
        {imported !== null && Number.isFinite(imported) ? (
          <Alert tone="success" className="mt-6">
            {imported === 1 ? "1 item" : `${imported} items`} sent for review. Items already proposed before were not sent again.
          </Alert>
        ) : null}

        <section id="period" aria-labelledby="period-heading" className="mt-10">
          <h2 id="period-heading" className="text-lg font-semibold text-foreground">
            A period of {aboutOther ? "their" : "my"} history
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Where {whose} worked or studied, in what role, and when.</p>
          <form action={proposePeriodAction} className="mt-4 grid gap-4 rounded-md border border-border-default px-4 py-5 sm:grid-cols-2">
            {hidden}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="period-org">Institution</Label>
              <Select id="period-org" name="organizationId" defaultValue="">
                <option value="">Not in the list — I will write the name</option>
                {institutions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.shortName && o.shortName !== o.name ? ` (${o.shortName})` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="period-neworg">Institution name, if not in the list</Label>
              <Input id="period-neworg" name="newOrganizationName" maxLength={300} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="period-capacity">Role</Label>
              <Select id="period-capacity" name="capacity" required defaultValue="">
                <option value="" disabled>
                  Choose one
                </option>
                {options.capacities.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <YearsAndSource prefix="period" userId={userId} />
            <div className="sm:col-span-2">
              <Button type="submit">Send for review</Button>
            </div>
          </form>
        </section>

        <section id="colleague" aria-labelledby="colleague-heading" className="mt-12">
          <h2 id="colleague-heading" className="text-lg font-semibold text-foreground">
            Someone {aboutOther ? "they" : "I"} worked with
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A mentor, a field partner, a co-author. If the person is not in the record yet, they will be added — provisional — when a steward accepts.
          </p>
          <form action={proposeColleagueAction} className="mt-4 grid gap-4 rounded-md border border-border-default px-4 py-5 sm:grid-cols-2">
            {hidden}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="colleague-search">Find the person in the record</Label>
              <PersonPicker name="colleaguePersonId" inputId="colleague-search" excludeId={aboutId} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="colleague-given">First name (if not found)</Label>
              <Input id="colleague-given" name="colleagueGivenName" maxLength={120} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="colleague-family">Last name (if not found)</Label>
              <Input id="colleague-family" name="colleagueFamilyName" maxLength={120} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="colleague-orcid">Their ORCID iD (optional)</Label>
              <Input id="colleague-orcid" name="colleagueOrcid" placeholder="0000-0002-1825-0097" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="colleague-kind">What kind of bond</Label>
              <Select id="colleague-kind" name="relationshipKind" required defaultValue="">
                <option value="" disabled>
                  Choose one
                </option>
                {options.relationshipKinds.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </div>
            <YearsAndSource prefix="colleague" userId={userId} />
            <div className="sm:col-span-2">
              <Button type="submit">Send for review</Button>
            </div>
          </form>
        </section>

        {!aboutOther ? (
          <section id="import" aria-labelledby="import-heading" className="mt-12">
            <h2 id="import-heading" className="text-lg font-semibold text-foreground">
              Bring in my CV
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each position and degree becomes a separate proposal. Importing again never duplicates what was already sent.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <form action={importOrcidAction} className="flex flex-col gap-3 rounded-md border border-border-default px-4 py-5">
                <input type="hidden" name="aboutPersonId" value={aboutId} />
                <Label htmlFor="import-orcid">My ORCID iD</Label>
                <Input id="import-orcid" name="orcid" required placeholder="0000-0002-1825-0097" />
                <Button type="submit" emphasis="secondary">
                  Import from ORCID
                </Button>
              </form>
              <form action={importLattesAction} className="flex flex-col gap-3 rounded-md border border-border-default px-4 py-5">
                <input type="hidden" name="aboutPersonId" value={aboutId} />
                <Label htmlFor="import-lattes">Currículo Lattes (XML file)</Label>
                <input id="import-lattes" name="lattes" type="file" accept=".xml,text/xml,application/xml" required className="text-sm text-foreground" />
                <p className="text-xs text-muted-foreground">On the Lattes page of your CV, choose “Baixar currículo em XML”.</p>
                <Button type="submit" emphasis="secondary">
                  Import from Lattes
                </Button>
              </form>
            </div>
          </section>
        ) : null}

        <section id="mine" aria-labelledby="mine-heading" className="mt-12">
          <h2 id="mine-heading" className="text-lg font-semibold text-foreground">
            My proposals
          </h2>
          {mine.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">You have not proposed anything yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {mine.map((c) => (
                <li key={c.id} className="rounded-md border border-border-default px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{describeCandidate(c)}</span>
                    <Badge size="sm" tone={STATUS[c.status].tone}>
                      {STATUS[c.status].label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {ORIGIN_LABELS[c.origin]} · Source: {c.sourceNote}
                    {c.evidencePaths.length > 0 ? ` · ${c.evidencePaths.length} file${c.evidencePaths.length > 1 ? "s" : ""}` : ""}
                  </p>
                  {c.status === "rejected" && c.decisionNote ? <p className="mt-1 text-foreground">Reason: {c.decisionNote}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </main>
  );
}
