"use server";

// Propose a contribution; accept or reject one. The database enforces who may
// do each, keeps proposals apart from the record, and audits every decision.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { readProposalForm } from "./parse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function friendly(raw: string): string {
  if (raw.includes("reviewer authorization required")) return "Only a steward of this person's institution can do this.";
  const known = raw.match(/(?:propose_contribution|steward_[a-z_]+): (.+)$/);
  const text = known?.[1];
  return text ? text.charAt(0).toUpperCase() + text.slice(1) + "." : "Something went wrong. Please try again.";
}

export async function proposeContributionAction(formData: FormData): Promise<void> {
  const path = "/member/contributions";
  const personId = String(formData.get("personId") ?? "");
  if (!UUID.test(personId)) back(path, "Your account is not linked to a person record yet.");
  const form = readProposalForm({
    title: String(formData.get("title") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    capacity: String(formData.get("capacity") ?? ""),
    sourceNote: String(formData.get("sourceNote") ?? ""),
    description: String(formData.get("description") ?? ""),
    startYear: String(formData.get("startYear") ?? ""),
    endYear: String(formData.get("endYear") ?? ""),
  });
  if (!form.ok) back(path, form.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_contribution", {
    p_person_id: personId,
    p_title: form.value.title,
    p_contribution_kind: form.value.kind,
    p_capacity: form.value.capacity,
    p_source_note: form.value.sourceNote,
    ...(form.value.description ? { p_description: form.value.description } : {}),
    ...(form.value.startYear !== null ? { p_start_year: form.value.startYear } : {}),
    ...(form.value.endYear !== null ? { p_end_year: form.value.endYear } : {}),
  });
  if (error) back(path, friendly(error.message ?? ""));
  revalidatePath(path);
  redirect(`${path}?sent=1`);
}

export async function decideContributionAction(formData: FormData): Promise<void> {
  const path = "/review/contributions";
  const candidateId = String(formData.get("candidateId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!UUID.test(candidateId) || (decision !== "accept" && decision !== "reject")) back(path, "Something went wrong. Please try again.");
  if (decision === "reject" && !note) back(path, "Say why it is not added — the person will read it.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_decide_contribution_candidate", {
    p_candidate_id: candidateId,
    p_decision: decision,
    ...(note ? { p_note: note } : {}),
  });
  if (error) back(path, friendly(error.message ?? ""));
  revalidatePath(path);
  redirect(path);
}
