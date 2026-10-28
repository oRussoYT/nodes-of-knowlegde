import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { pageTitle } from "@/config/site";
import { decideHeritageAction } from "@/features/heritage/actions";
import { describeSpan, fileView } from "@/features/heritage/parse";
import { getHeritageItem } from "@/features/heritage/read";
import { getHeritageCare } from "@/features/privacy/read";
import { isCurrentUserSteward } from "@/features/review/authorization";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: pageTitle("History"),
};

export default async function HeritageItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { itemId } = await params;
  const raw = await searchParams;
  if (!UUID.test(itemId)) notFound();
  const found = await getHeritageItem(itemId);
  if (!found) notFound();
  const { item, fileUrl } = found;
  const isSteward = await isCurrentUserSteward();
  const care = await getHeritageCare(item.id);
  const span = describeSpan(item);
  const view = fileView(item.filePath);
  const error = typeof raw.error === "string" ? raw.error : null;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <p className="text-sm">
          <Link href={`/history?kind=${item.kind}`} className="underline underline-offset-2">
            {item.kindLabel}
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">{item.title}</h1>
        {item.scientificName ? <p className="mt-1 text-lg italic text-foreground">{item.scientificName}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {item.reviewStatus === "proposed" ? (
            <Badge tone="info">Waiting for review</Badge>
          ) : item.reviewStatus === "rejected" ? (
            <Badge tone="neutral">Declined</Badge>
          ) : item.verificationStatus === "confirmed" ? (
            <Badge tone="success">Confirmed</Badge>
          ) : (
            <Badge tone="neutral">Provisional</Badge>
          )}
          {item.visibility === "restricted" ? <Badge tone="warning">Restricted — stewards only</Badge> : null}
          {item.visibility === "community" ? <Badge tone="warning">Community material{care.community ? ` — ${care.community.name}` : ""}</Badge> : null}
          {span ? <span>{span}</span> : null}
          {item.place ? <span>· {item.place}</span> : null}
          {item.organizationId ? (
            <span>
              ·{" "}
              <Link href={`/institutions/${item.organizationId}`} className="underline underline-offset-2">
                {item.organizationName}
              </Link>
            </span>
          ) : null}
        </div>

        {raw.added === "1" ? (
          <Alert tone="success" className="mt-6">
            {item.reviewStatus === "proposed" ? "Sent. A steward will check it; until then only you see it." : "Added."}
          </Alert>
        ) : null}
        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}

        {fileUrl && view === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- private signed link, not optimizable
          <img src={fileUrl} alt={item.title} className="mt-8 max-h-[70vh] w-auto rounded-md border border-border-default" />
        ) : null}
        {fileUrl && view === "audio" ? <audio controls src={fileUrl} className="mt-8 w-full" /> : null}
        {fileUrl && (view === "pdf" || view === "other") ? (
          <p className="mt-8">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Open the file
            </a>
          </p>
        ) : null}

        {care.labels.length > 0 ? (
          <ul aria-label="Community labels" className="mt-6 flex flex-col gap-2">
            {care.labels.map((l) => (
              <li key={l.key} className="rounded-md border border-border-default px-3 py-2 text-sm">
                <strong>{l.label}</strong> <span className="text-muted-foreground">— {l.description}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {item.summary ? <p className="mt-8 whitespace-pre-line text-foreground">{item.summary}</p> : null}

        <dl className="mt-8 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">What documents it</dt>
          <dd className="text-foreground">{item.sourceNote}</dd>
          {item.externalUrl ? (
            <>
              <dt className="text-muted-foreground">Link</dt>
              <dd>
                <a href={item.externalUrl} target="_blank" rel="noreferrer" className="break-all underline underline-offset-2">
                  {item.externalUrl}
                </a>
              </dd>
            </>
          ) : null}
          {item.latitude !== null && item.longitude !== null ? (
            <>
              <dt className="text-muted-foreground">Coordinates</dt>
              <dd className="text-foreground">
                {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
              </dd>
            </>
          ) : null}
          {item.reviewStatus === "rejected" && item.decisionNote ? (
            <>
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="text-foreground">{item.decisionNote}</dd>
            </>
          ) : null}
        </dl>

        {item.links.length > 0 ? (
          <section aria-labelledby="links-heading" className="mt-10">
            <h2 id="links-heading" className="text-lg font-semibold text-foreground">
              Linked to
            </h2>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {item.links.map((l) => (
                <li key={l.id}>
                  {l.personId ? (
                    <Link href={`/people/${l.personId}`} className="underline underline-offset-2">
                      {l.personName}
                    </Link>
                  ) : l.organizationId ? (
                    <Link href={`/institutions/${l.organizationId}`} className="underline underline-offset-2">
                      {l.organizationName}
                    </Link>
                  ) : l.itemId ? (
                    <Link href={`/history/${l.itemId}`} className="underline underline-offset-2">
                      {l.itemTitle}
                    </Link>
                  ) : null}
                  {l.role ? <span className="text-muted-foreground"> · {l.role}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {isSteward && !item.isMine && item.reviewStatus === "proposed" ? (
          <form action={decideHeritageAction} className="mt-10 flex flex-wrap items-end gap-3 rounded-md border border-border-default px-4 py-4">
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="back" value="item" />
            <div className="flex min-w-60 flex-1 flex-col gap-1.5">
              <Label htmlFor="note">Note to the person (needed when declining)</Label>
              <Input id="note" name="note" maxLength={1000} />
            </div>
            <Button type="submit" name="decision" value="accept">
              Accept as provisional
            </Button>
            <Button type="submit" name="decision" value="reject" emphasis="secondary">
              Decline
            </Button>
          </form>
        ) : null}
        {isSteward && item.reviewStatus === "accepted" && item.verificationStatus === "provisional" ? (
          <form action={decideHeritageAction} className="mt-10">
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="back" value="item" />
            <Button type="submit" name="decision" value="confirm" emphasis="secondary">
              Mark as confirmed (checked against the source)
            </Button>
          </form>
        ) : null}
      </Container>
    </main>
  );
}
