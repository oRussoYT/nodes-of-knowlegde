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
import { INSTITUTION_KINDS, PLANS } from "@/config/plans";
import { pageTitle } from "@/config/site";
import { answerPlanRequestAction } from "@/features/university/actions";
import { REQUEST_STATUS_LABEL } from "@/features/university/parse";
import { getPlanRequestQueue } from "@/features/university/read";

// Plan requests from institutions, oldest first. Platform reviewers answer;
// each answer is audited. Nothing is charged here.
export const metadata: Metadata = {
  title: pageTitle("Plan requests"),
};

export default async function PlanRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const error = typeof raw.error === "string" ? raw.error : null;
  const saved = raw.saved === "1";
  const queue = await getPlanRequestQueue();

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Plan requests"
          description="Institutions asking to use the engine. Answer each one; the institution sees your note."
          action={
            <Link href="/review/console" className="text-sm underline underline-offset-2">
              Steward console
            </Link>
          }
        />
        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        {saved ? (
          <Alert tone="success" className="mt-6">
            Saved.
          </Alert>
        ) : null}
        {queue === null ? (
          <EmptyState className="mt-8" title="Only platform reviewers see plan requests" />
        ) : queue.length === 0 ? (
          <EmptyState className="mt-8" title="No requests yet" description="Requests sent from the Plans page appear here." />
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {queue.map((r) => (
              <li key={r.id} className="rounded-md border border-border-default px-4 py-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-foreground">{r.institutionName}</h2>
                  <Badge size="sm" tone={r.status === "approved" ? "success" : r.status === "declined" ? "neutral" : "info"}>
                    {REQUEST_STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {INSTITUTION_KINDS.find((k) => k.key === r.institutionKind)?.label ?? r.institutionKind} ·{" "}
                  {PLANS.find((p) => p.key === r.plan)?.name ?? r.plan}
                  {r.country ? ` · ${r.country}` : ""}
                  {r.peopleEstimate ? ` · about ${r.peopleEstimate} people` : ""}
                </p>
                <p className="mt-1 text-foreground">
                  {r.contactName}
                  {r.contactRole ? `, ${r.contactRole}` : ""}
                  {r.requesterEmail ? ` · ${r.requesterEmail}` : ""}
                </p>
                {r.message ? <p className="mt-2 whitespace-pre-line text-foreground">{r.message}</p> : null}
                <form action={answerPlanRequestAction} className="mt-3 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="requestId" value={r.id} />
                  <div className="flex min-w-60 flex-1 flex-col gap-1.5">
                    <Label htmlFor={`note-${r.id}`}>Note to the institution</Label>
                    <Input id={`note-${r.id}`} name="note" defaultValue={r.answerNote ?? ""} maxLength={1000} />
                  </div>
                  <Button type="submit" name="status" value="in_conversation" emphasis="secondary">
                    In conversation
                  </Button>
                  <Button type="submit" name="status" value="approved">
                    Approve
                  </Button>
                  <Button type="submit" name="status" value="declined" emphasis="secondary">
                    Decline
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
