"use server";

// "Bring in their history": fetch an accepted OpenAlex author's affiliations
// (with ROR details) and works, and let the database record them as
// provisional, each with its public link. The database authorizes and audits.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { fetchOpenAlexHistory } from "./history";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PEOPLE_PER_RUN = 15;

interface Counts {
  institutionsCreated: number;
  institutionsLinked: number;
  affiliations: number;
  works: number;
}

function readCounts(data: unknown): Counts {
  const r = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const n = (k: string) => (typeof r[k] === "number" ? (r[k] as number) : 0);
  return {
    institutionsCreated: n("institutionsCreated"),
    institutionsLinked: n("institutionsLinked"),
    affiliations: n("affiliations"),
    works: n("works"),
  };
}

/** Plain-language summary of one or more runs. */
export async function describeCounts(c: Counts): Promise<string> {
  if (c.affiliations + c.works + c.institutionsCreated === 0) return "Nothing new was found — the record is already up to date.";
  return `Added ${c.affiliations} institution period(s), ${c.works} work(s) and ${c.institutionsCreated} new institution(s). All are provisional until someone confirms them.`;
}

type RunResult = { ok: true; counts: Counts } | { ok: false; message: string };

async function runForPerson(personId: string): Promise<RunResult> {
  const supabase = await createClient();
  const { data: authorId, error: idError } = await supabase.rpc("steward_openalex_author_for_person", { p_person_id: personId });
  if (idError) return { ok: false, message: "Only stewards can bring in a history." };
  if (typeof authorId !== "string" || !authorId) {
    return { ok: false, message: "This person has no confirmed OpenAlex match yet. Find them in OpenAlex first (Import → Where they went)." };
  }

  const payload = await fetchOpenAlexHistory(authorId);
  if (!payload) return { ok: false, message: "OpenAlex did not answer. Please try again in a minute." };

  const { data, error } = await supabase.rpc("steward_record_openalex_history", {
    p_person_id: personId,
    p_payload: payload as unknown as Json,
  });
  if (error) return { ok: false, message: "The history could not be saved. Please try again." };
  return { ok: true, counts: readCounts(data) };
}

export async function bringInPersonHistoryAction(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId") ?? "");
  if (!UUID.test(personId)) redirect("/people");
  const path = `/people/${personId}`;

  const result = await runForPerson(personId);
  if (!result.ok) redirect(`${path}?historyError=${encodeURIComponent(result.message)}`);

  revalidatePath(path);
  redirect(`${path}?historyNotice=${encodeURIComponent(await describeCounts(result.counts))}`);
}

export async function bringInBatchHistoryAction(formData: FormData): Promise<void> {
  const batchId = String(formData.get("batchId") ?? "");
  if (!UUID.test(batchId)) redirect("/review/import");
  const path = `/review/import/${batchId}`;
  const raw = formData.getAll("personId").map(String).filter((id) => UUID.test(id));
  const people = [...new Set(raw)].slice(0, MAX_PEOPLE_PER_RUN);
  if (people.length === 0) redirect(`${path}?error=${encodeURIComponent("Nobody on this list has a confirmed OpenAlex match yet.")}`);

  const total: Counts = { institutionsCreated: 0, institutionsLinked: 0, affiliations: 0, works: 0 };
  let failed = 0;
  for (const personId of people) {
    const result = await runForPerson(personId);
    if (!result.ok) {
      failed += 1;
      continue;
    }
    total.institutionsCreated += result.counts.institutionsCreated;
    total.institutionsLinked += result.counts.institutionsLinked;
    total.affiliations += result.counts.affiliations;
    total.works += result.counts.works;
  }

  revalidatePath(path);
  const more = raw.length > people.length ? ` Click again for the next ${Math.min(MAX_PEOPLE_PER_RUN, raw.length - people.length)}.` : "";
  const failures = failed > 0 ? ` ${failed} could not be reached; try again.` : "";
  redirect(`${path}?notice=${encodeURIComponent(`${await describeCounts(total)}${failures}${more}`)}`);
}
