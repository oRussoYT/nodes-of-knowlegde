"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { parsePlanRequestForm } from "./parse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requestPlanAction(form: FormData): Promise<void> {
  const parsed = parsePlanRequestForm(form);
  if (!parsed.ok) redirect(`/plans?error=${encodeURIComponent(parsed.error)}#request`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_plan", { p: parsed.payload as Json });
  if (error) {
    const msg = error.message.includes("daily") ? "You sent several requests today. We will answer them first." : "The request could not be sent. Please try again.";
    redirect(`/plans?error=${encodeURIComponent(msg)}#request`);
  }
  revalidatePath("/plans");
  redirect("/plans?sent=1#request");
}

export async function answerPlanRequestAction(form: FormData): Promise<void> {
  const id = String(form.get("requestId") ?? "");
  const status = String(form.get("status") ?? "");
  const note = String(form.get("note") ?? "").trim();
  if (!UUID.test(id)) redirect("/review/plans");
  if (status === "declined" && note === "") redirect(`/review/plans?error=${encodeURIComponent("Write a note when you decline.")}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_answer_plan_request", { p_request_id: id, p_status: status, p_note: note || undefined });
  if (error) redirect(`/review/plans?error=${encodeURIComponent("The answer could not be saved. Please try again.")}`);
  revalidatePath("/review/plans");
  redirect("/review/plans?saved=1");
}
