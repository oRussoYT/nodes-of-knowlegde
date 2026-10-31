"use server";

// Signed interpretations: write, decide, withdraw, hide. The database checks
// who may do what and audits every decision.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { interpretationError } from "./parse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(form: FormData): string {
  const to = String(form.get("returnTo") ?? "");
  return to.startsWith("/") && !to.startsWith("//") ? to : "/member";
}

function withParam(path: string, key: string, value: string): string {
  const [base, hash] = path.split("#");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${key}=${encodeURIComponent(value)}#${hash ?? "interpretations"}`;
}

export async function writeInterpretationAction(form: FormData): Promise<void> {
  const to = back(form);
  const subjectId = String(form.get("subjectId") ?? "");
  const subjectType = form.get("subjectType") === "contribution" ? "contribution" : "person";
  const body = String(form.get("body") ?? "").trim();
  const sources = String(form.get("sources") ?? "").trim();
  if (!UUID.test(subjectId)) redirect(withParam(to, "interpretationError", "Something is missing."));
  if (body.length < 20) redirect(withParam(to, "interpretationError", "Write at least a couple of sentences."));
  const supabase = await createClient();
  const { error } = await supabase.rpc("write_interpretation", {
    p_type: subjectType,
    p_subject: subjectId,
    p_body: body.slice(0, 4000),
    p_sources: sources.slice(0, 1000) || null,
  });
  if (error) redirect(withParam(to, "interpretationError", interpretationError(error.message)));
  revalidatePath(to.split("?")[0]);
  redirect(withParam(to, "interpretation", "sent"));
}

export async function decideInterpretationAction(form: FormData): Promise<void> {
  const to = back(form);
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) redirect(to);
  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_decide_interpretation", {
    p_id: id,
    p_publish: form.get("decision") === "publish",
    p_note: String(form.get("note") ?? "").trim() || null,
  });
  if (error) redirect(withParam(to, "interpretationError", "That decision could not be saved."));
  revalidatePath(to.split("?")[0]);
  redirect(to);
}

export async function withdrawInterpretationAction(form: FormData): Promise<void> {
  const to = back(form);
  const id = String(form.get("id") ?? "");
  if (UUID.test(id)) {
    const supabase = await createClient();
    await supabase.rpc("withdraw_interpretation", { p_id: id });
  }
  revalidatePath(to.split("?")[0]);
  redirect(to);
}

export async function hideInterpretationAction(form: FormData): Promise<void> {
  const to = back(form);
  const id = String(form.get("id") ?? "");
  if (UUID.test(id)) {
    const supabase = await createClient();
    await supabase.rpc("hide_interpretation_about_me", { p_id: id });
  }
  revalidatePath(to.split("?")[0]);
  redirect(to);
}
