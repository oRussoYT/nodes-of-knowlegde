"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { parseHeritageForm } from "./parse";
import { getHeritageKinds } from "./read";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function proposeHeritageAction(form: FormData): Promise<void> {
  const kinds = (await getHeritageKinds()).map((k) => k.key);
  const parsed = parseHeritageForm(form, kinds);
  if (!parsed.ok) redirect(`/history/new?error=${encodeURIComponent(parsed.error)}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("propose_heritage_item", { p: parsed.payload as Json });
  if (error || typeof data !== "string") {
    const msg = error?.message.includes("daily") ? "You reached today's limit. Try again tomorrow." : error?.message.includes("own uploads") ? "Attach the file again." : "It could not be saved. Please check the fields and try again.";
    redirect(`/history/new?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/history");
  redirect(`/history/${data}?added=1`);
}

export async function decideHeritageAction(form: FormData): Promise<void> {
  const id = String(form.get("itemId") ?? "");
  const decision = String(form.get("decision") ?? "");
  const note = String(form.get("note") ?? "").trim();
  const back = String(form.get("back") ?? "") === "item" ? `/history/${id}` : "/review/queue";
  if (!UUID.test(id)) redirect("/review/queue");
  if (decision === "reject" && note === "") redirect(`${back}?error=${encodeURIComponent("Write a reason for the person when you decline.")}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_decide_heritage_item", { p_id: id, p_decision: decision, p_note: note || undefined });
  if (error) {
    const msg = error.message.includes("own proposal")
      ? "Someone else must review your own proposal."
      : error.message.includes("second person")
        ? "Another steward must confirm — not the one who added or accepted it."
        : error.message.includes("community decides")
          ? "Only the community's own stewards decide about its material."
          : "The decision could not be saved.";
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/history");
  revalidatePath(`/history/${id}`);
  redirect(`${back}?decided=1`);
}
