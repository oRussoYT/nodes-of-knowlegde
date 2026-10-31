import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { pageTitle } from "@/config/site";
import { joinNodeAction, leaveNodeAction } from "@/features/nodes/actions";
import { PLAN_LABELS, ROLE_LABELS, nodeLabel } from "@/features/nodes/parse";
import { getNodeLinks } from "@/features/forum/read";
import { getNode } from "@/features/nodes/read";
import { getNodeVocabulary } from "@/features/nodes/vocabulary";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface NodePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ joined?: string; error?: string }>;
}

export async function generateMetadata({ params }: NodePageProps): Promise<Metadata> {
  const { slug } = await params;
  const node = await getNode(slug);
  return { title: pageTitle(node ? nodeLabel(node) : "Node") };
}

const nf = new Intl.NumberFormat("en");

// A Knowledge Node's public home: its identity, what the record holds there
// (counts only, never names) and the way in -- one Nodes of Knowledge
// account, joined to this Node.
export default async function NodePage({ params, searchParams }: NodePageProps) {
  const { slug } = await params;
  const { joined, error } = await searchParams;
  const node = await getNode(slug);
  if (!node) notFound();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const label = nodeLabel(node);
  const links = await getNodeLinks(node.slug);
  const vocabulary = await getNodeVocabulary(node.slug);
  const cover = node.coverPhoto ?? "/photos/aerial";

  const stats = [
    { value: node.counts.people, label: node.counts.people === 1 ? "person documented" : "people documented" },
    { value: node.counts.institutions, label: node.counts.institutions === 1 ? "institution" : "institutions" },
    { value: node.counts.works, label: node.counts.works === 1 ? "work" : "works" },
  ];

  return (
    <main id="main-content" tabIndex={-1}>
      <section data-theme="dark" className="relative isolate overflow-hidden bg-nk-ink text-nk-bone">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative cover, already compressed (public/photos) */}
        <img
          src={`${cover}-1920.jpg`}
          srcSet={`${cover}-960.jpg 960w, ${cover}-1920.jpg 1920w`}
          sizes="100vw"
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover opacity-45"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-nk-ink via-nk-ink/60 to-nk-ink/10" />
        <div className="mx-auto max-w-[90rem] px-5 pb-14 pt-24 sm:px-10 sm:pb-20 sm:pt-36">
          <p className="flex items-center gap-3 text-sm text-[#c3c8b6]">
            <span aria-hidden="true" className="size-2 rounded-full bg-nk-lime" />
            A Node of <Link href="/nodes" className="underline underline-offset-4">Nodes of Knowledge</Link>
            {node.counts.firstYear ? <span>· documented since {node.counts.firstYear}</span> : null}
          </p>
          <h1 className="mt-6 font-display text-6xl font-extrabold leading-[0.9] tracking-[-0.04em] [font-stretch:110%] sm:text-8xl lg:text-9xl">
            {label}
          </h1>
          <p className="mt-4 max-w-3xl font-display text-2xl font-semibold leading-tight text-nk-bone sm:text-3xl">{node.name}</p>
          {node.tagline ? <p className="mt-5 max-w-2xl text-lg text-[#c3c8b6]">{node.tagline}</p> : null}

          <div className="mt-10 flex flex-wrap items-center gap-3">
            {node.isMember ? (
              <>
                <span className="rounded-full border border-nk-lime px-5 py-3 text-sm font-semibold text-nk-lime">You are part of {label}</span>
                <Link href="/explore" className="rounded-full bg-nk-lime px-6 py-3 text-sm font-semibold text-nk-ink">
                  Read the record
                </Link>
              </>
            ) : signedIn ? (
              <form action={joinNodeAction}>
                <input type="hidden" name="slug" value={node.slug} />
                <SubmitButton pendingLabel="Joining…">Join {label}</SubmitButton>
              </form>
            ) : (
              <>
                <Link href="/register" className="rounded-full bg-nk-lime px-6 py-3 text-sm font-semibold text-nk-ink">
                  Create an account to join {label}
                </Link>
                <Link
                  href={`/login?returnTo=${encodeURIComponent(`/n/${node.slug}`)}`}
                  className="rounded-full border border-nk-bone/40 px-6 py-3 text-sm font-semibold text-nk-bone"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[76rem] px-5 py-12 sm:px-10">
        <div className="space-y-3">
          {joined === "1" ? <FormMessage tone="success">Welcome to {label}. Your one account now includes this Node.</FormMessage> : null}
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        </div>

        <dl className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse gap-2 rounded-2xl border border-border-default bg-surface px-6 py-6">
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="font-display text-5xl font-bold leading-none tabular-nums text-foreground [font-stretch:80%]">{nf.format(s.value)}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6">
          <Link href={`/n/${node.slug}/observatory`} className="text-sm font-semibold underline underline-offset-4">
            Open the {label} Observatory — numbers over time and where knowledge travelled
          </Link>
          {node.isMember ? (
            <>
              {" · "}
              <Link href={`/forum/${node.slug}`} className="text-sm font-semibold underline underline-offset-4">
                Forum
              </Link>
            </>
          ) : null}
        </p>
        {vocabulary.length > 0 ? (
          <section aria-labelledby="vocab-heading" className="mt-8 grid gap-6 sm:grid-cols-2">
            <h2 id="vocab-heading" className="sr-only">
              The words of this Node
            </h2>
            {(["role", "field"] as const).map((kind) =>
              vocabulary.some((v) => v.kind === kind) ? (
                <div key={kind}>
                  <h3 className="text-sm font-medium text-foreground">{kind === "role" ? `Roles at ${label}` : "Fields of study"}</h3>
                  <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                    {vocabulary
                      .filter((v) => v.kind === kind)
                      .map((v) => (
                        <li key={v.id} className="rounded-full border border-border-default px-3 py-1" title={v.description ?? undefined}>
                          {v.label}
                          {v.baseLabel && v.baseLabel.toLowerCase() !== v.label.toLowerCase() ? <span className="text-muted-foreground"> · {v.baseLabel}</span> : null}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null,
            )}
          </section>
        ) : null}
        {links.length > 0 ? (
          <section aria-labelledby="links-heading" className="mt-6">
            <h2 id="links-heading" className="text-sm font-medium text-foreground">
              Connected Nodes
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {links.map((l) => (
                <li key={l.slug}>
                  <Link href={`/n/${l.slug}`} className="rounded-full border border-border-default px-3 py-1 underline-offset-2 hover:underline">
                    {l.shortName ?? l.name} · {l.peopleInCommon} {l.peopleInCommon === 1 ? "person" : "people"} in common
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="font-display text-3xl font-bold tracking-tight text-foreground">
              About this Node
            </h2>
            {node.description ? <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-foreground">{node.description}</p> : null}
            <p className="mt-4 max-w-prose text-sm text-muted-foreground">
              Everything here has a source. What the system proposes stays a proposal until a person confirms it, and nobody
              is ranked. One Nodes of Knowledge account works across every Node.
            </p>
          </section>

          <section aria-labelledby="inst-heading">
            <h2 id="inst-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
              Institutions in this Node
            </h2>
            {node.institutions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">None recorded yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {node.institutions.map((inst) => (
                  <li key={inst.id} className="rounded-2xl border border-border-default bg-surface px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{ROLE_LABELS[inst.role]}</p>
                    {signedIn ? (
                      <Link href={`/institutions/${inst.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                        {inst.name}
                      </Link>
                    ) : (
                      <p className="font-medium text-foreground">{inst.name}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-xs text-muted-foreground">Plan: {PLAN_LABELS[node.plan]}</p>
            {node.isMember ? (
              <form action={leaveNodeAction} className="mt-2">
                <input type="hidden" name="slug" value={node.slug} />
                <button type="submit" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  Leave this Node
                </button>
              </form>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
