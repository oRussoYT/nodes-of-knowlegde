"use server";

// Proposals that would change the record. The database checks who may
// propose, limits volume, de-duplicates imports and keeps evidence private;
// a steward decides. Nothing here writes a fact.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { decodeLattes, fetchOrcidPeriods, orcidId, periodsFromLattes, type ImportedPeriod } from "./importers";
import { parseColleagueForm, parseParticipationForm, type ProposalResult } from "./parse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function friendly(message: string | undefined): string {
  if (message?.includes("daily")) return "You reached today's limit of proposals. Try again tomorrow.";
  if (message?.includes("own uploads") || message?.includes("evidence")) return "One of the attached files could not be used. Attach it again.";
  if (message?.includes("two different")) return "A bond needs two different people.";
  return "The proposal could not be sent. Please check the fields and try again.";
}

function back(form: FormData): string {
  const about = String(form.get("returnAbout") ?? "");
  const name = String(form.get("returnName") ?? "").slice(0, 200);
  return UUID.test(about) ? `/member/add?about=${about}${name ? `&name=${encodeURIComponent(name)}` : ""}` : "/member/add";
}

function withParam(path: string, key: string, value: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

async function send(form: FormData, parsed: ProposalResult, anchor: string): Promise<void> {
  const path = back(form);
  if (!parsed.ok) redirect(`${withParam(path, "error", parsed.error)}#${anchor}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_record", { p: parsed.payload as Json });
  if (error) redirect(`${withParam(path, "error", friendly(error.message))}#${anchor}`);
  revalidatePath("/member/add");
  redirect(`${withParam(path, "sent", "1")}#mine`);
}

export async function proposePeriodAction(form: FormData): Promise<void> {
  await send(form, parseParticipationForm(form), "period");
}

export async function proposeColleagueAction(form: FormData): Promise<void> {
  await send(form, parseColleagueForm(form), "colleague");
}

export async function findPeopleAction(query: string): Promise<{ id: string; displayName: string }[]> {
  const q = query.trim();
  if (q.length < 2 || q.length > 100) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_people_for_proposal", { p_query: q });
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((r) =>
    r && typeof r === "object" && typeof (r as Record<string, unknown>).id === "string"
      ? [{ id: (r as { id: string }).id, displayName: String((r as { displayName?: unknown }).displayName ?? "") }]
      : [],
  );
}

export async function decideRecordCandidateAction(form: FormData): Promise<void> {
  const id = String(form.get("candidateId") ?? "");
  const accept = form.get("decision") === "accept";
  const note = String(form.get("note") ?? "").trim();
  if (!UUID.test(id)) redirect("/review/queue");
  if (!accept && note === "") redirect(`/review/queue?error=${encodeURIComponent("Write a reason for the person when you decline.")}#c-${id}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_decide_record_candidate", {
    p_candidate_id: id,
    p_accept: accept,
    p_note: note || undefined,
  });
  if (error) {
    const msg = error.message.includes("own proposal") ? "Someone else must review your own proposal." : "The decision could not be saved. Please try again.";
    redirect(`/review/queue?error=${encodeURIComponent(msg)}#c-${id}`);
  }
  revalidatePath("/review/queue");
  redirect(`/review/queue?decided=${accept ? "accepted" : "declined"}`);
}

/** Many imported periods become many proposals (one each, de-duplicated). */
async function proposeImported(personId: string, periods: ImportedPeriod[], origin: "orcid" | "lattes", note: string): Promise<number> {
  const supabase = await createClient();
  let sent = 0;
  for (const p of periods.slice(0, 60)) {
    const { error } = await supabase.rpc("propose_record", {
      p: {
        kind: "participation",
        origin,
        externalKey: p.externalKey,
        aboutPersonId: personId,
        newOrganizationName: p.organizationName,
        capacity: p.capacity,
        startYear: p.startYear,
        endYear: p.endYear,
        isOngoing: p.isOngoing,
        summary: p.summary,
        sourceNote: note,
      } as Json,
    });
    if (!error) sent += 1;
  }
  return sent;
}

export async function importOrcidAction(form: FormData): Promise<void> {
  const personId = String(form.get("aboutPersonId") ?? "");
  const id = orcidId(String(form.get("orcid") ?? ""));
  if (!UUID.test(personId)) redirect("/member/add");
  if (!id) redirect(`/member/add?error=${encodeURIComponent("The ORCID iD should look like 0000-0002-1825-0097.")}#import`);
  const periods = await fetchOrcidPeriods(id);
  if (periods === null) redirect(`/member/add?error=${encodeURIComponent("ORCID could not be reached. Try again in a minute.")}#import`);
  if (periods.length === 0) redirect(`/member/add?error=${encodeURIComponent("This ORCID record has no public employments or education.")}#import`);
  const sent = await proposeImported(personId, periods, "orcid", `ORCID public record https://orcid.org/${id}`);
  revalidatePath("/member/add");
  redirect(`/member/add?imported=${sent}#mine`);
}

export async function importLattesAction(form: FormData): Promise<void> {
  const personId = String(form.get("aboutPersonId") ?? "");
  const file = form.get("lattes");
  if (!UUID.test(personId)) redirect("/member/add");
  if (!(file instanceof File) || file.size === 0) redirect(`/member/add?error=${encodeURIComponent("Choose the XML file of your Currículo Lattes.")}#import`);
  if (file.size > 8 * 1024 * 1024) redirect(`/member/add?error=${encodeURIComponent("The file is larger than 8 MB.")}#import`);
  const xml = decodeLattes(new Uint8Array(await file.arrayBuffer()));
  const { periods } = periodsFromLattes(xml);
  if (periods.length === 0) redirect(`/member/add?error=${encodeURIComponent("No education or positions were found in this file. Is it the XML export of the Lattes CV?")}#import`);
  const sent = await proposeImported(personId, periods, "lattes", "Currículo Lattes (XML sent by the person)");
  revalidatePath("/member/add");
  redirect(`/member/add?imported=${sent}#mine`);
}
