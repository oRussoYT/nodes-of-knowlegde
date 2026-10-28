import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
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
import { createNodeAction, setNodeOrganizationAction } from "@/features/nodes/admin-actions";
import { PLAN_LABELS, nodeLabel } from "@/features/nodes/parse";
import { getNode, listNodes } from "@/features/nodes/read";
import { getStewardScope } from "@/features/steward/read";

// Nodes on the one engine (ROTEIRO fase 2, etapa N). Platform reviewers
// create a Node and choose its institutions; everything is audited.
export const metadata: Metadata = {
  title: pageTitle("Nodes"),
};

export default async function NodeAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const scope = await getStewardScope();
  if (!scope.platform) {
    return (
      <main id="main-content" tabIndex={-1} className="py-16">
        <Container width="content">
          <PageHeader title="Nodes" />
          <EmptyState className="mt-8" title="Only platform reviewers create Nodes" />
        </Container>
      </main>
    );
  }
  const [nodes, institutions] = await Promise.all([listNodes(), getInstitutionsIndex()]);
  const details = await Promise.all(nodes.map((n) => getNode(n.slug)));
  const error = typeof raw.error === "string" ? raw.error : null;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Nodes"
          description="One engine, many Nodes. Create a Node for a new institution or programme and choose its institutions. Its page, Observatory and forum appear at once."
          action={
            <Link href="/compare" className="text-sm underline underline-offset-2">
              Compare Nodes
            </Link>
          }
        />
        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        {typeof raw.created === "string" ? (
          <Alert tone="success" className="mt-6">
            Node created. Add its institutions below.
          </Alert>
        ) : null}

        <ul className="mt-8 flex flex-col gap-4">
          {details.map((n) =>
            n ? (
              <li key={n.slug} id={n.slug} className="rounded-md border border-border-default px-4 py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/n/${n.slug}`} className="font-semibold text-foreground underline underline-offset-2">
                    {nodeLabel(n)} — {n.name}
                  </Link>
                  <span className="text-muted-foreground">
                    {PLAN_LABELS[n.plan]} · {n.counts.people} people · {n.institutions.length} institutions
                  </span>
                </div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {n.institutions.map((i) => (
                    <li key={i.id} className="flex items-center gap-1 rounded-full border border-border-default px-3 py-1">
                      {i.name} <span className="text-muted-foreground">({i.role})</span>
                      <form action={setNodeOrganizationAction}>
                        <input type="hidden" name="slug" value={n.slug} />
                        <input type="hidden" name="organizationId" value={i.id} />
                        <input type="hidden" name="include" value="0" />
                        <button type="submit" aria-label={`Remove ${i.name} from ${nodeLabel(n)}`} className="ml-1 text-muted-foreground">
                          ×
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
                <form action={setNodeOrganizationAction} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="slug" value={n.slug} />
                  <div className="flex min-w-60 flex-1 flex-col gap-1">
                    <Label htmlFor={`org-${n.slug}`}>Add an institution</Label>
                    <Select id={`org-${n.slug}`} name="organizationId" defaultValue="">
                      <option value="" disabled>
                        Choose one
                      </option>
                      {institutions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Select aria-label="Role" name="role" defaultValue="core">
                    <option value="core">Core</option>
                    <option value="host">Host</option>
                    <option value="partner">Partner</option>
                  </Select>
                  <Button type="submit" size="sm" emphasis="secondary">
                    Add
                  </Button>
                </form>
              </li>
            ) : null,
          )}
        </ul>

        <form action={createNodeAction} className="mt-10 grid gap-4 rounded-md border border-border-default px-4 py-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold text-foreground sm:col-span-2">Create a Node</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-name">Name</Label>
            <Input id="node-name" name="name" required placeholder="e.g. Mamirauá Sustainable Development Institute" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-short">Short name</Label>
            <Input id="node-short" name="shortName" placeholder="e.g. Mamirauá" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-slug">Address (/n/…)</Label>
            <Input id="node-slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="mamiraua" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-plan">Plan</Label>
            <Select id="node-plan" name="plan" defaultValue="pro_bono">
              <option value="pro_bono">Pro bono (conservation research)</option>
              <option value="paid">Paid (university, centre, museum)</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="node-tagline">One line</Label>
            <Input id="node-tagline" name="tagline" maxLength={200} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="node-description">About (optional)</Label>
            <Textarea id="node-description" name="description" rows={3} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Create Node</Button>
          </div>
        </form>
      </Container>
    </main>
  );
}
