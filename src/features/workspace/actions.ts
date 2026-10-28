"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { parseNoteForm, proposalFromNote } from "./parse";
import { getMyNote } from "./read";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveNoteAction(form: FormData): Promise<void> {
  const parsed = parseNoteForm(form);
  const back = typeof form.get("id") === "string" && UUID.test(String(form.get("id"))) ? `/workspace/${form.get("id")}` : "/workspace";
  if (!parsed.ok) redirect(`${back}?error=${encodeURIComponent(parsed.error)}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_research_note", { p: parsed.payload as Json });
  if (error || typeof data !== "string") redirect(`${back}?error=${encodeURIComponent("It could not be saved.")}`);
  revalidatePath("/workspace");
  redirect(`/workspace/${data}?saved=1`);
}

export async function deleteNoteAction(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  if (UUID.test(id)) {
    const supabase = await createClient();
    await supabase.rpc("delete_research_note", { p_id: id });
  }
  revalidatePath("/workspace");
  redirect("/workspace?deleted=1");
}

/** Sends a private note for review: it becomes a proposal in the history. */
export async function submitNoteAction(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) redirect("/workspace");
  const found = await getMyNote(id);
  if (!found) redirect("/workspace");
  const { note } = found;
  if (note.submittedItemId) redirect(`/workspace/${id}`);
  const supabase = await createClient();
  let heritagePath: string | null = null;
  if (note.filePath) {
    const file = await supabase.storage.from("workspace").download(note.filePath);
    if (file.data) {
      const name = note.filePath.split("/").slice(1).join("/");
      const uid = note.filePath.split("/")[0]!;
      const target = `${uid}/${Date.now()}-${name}`.slice(0, 300);
      const up = await supabase.storage.from("heritage").upload(target, file.data, { contentType: file.data.type || undefined, upsert: false });
      if (!up.error) heritagePath = target;
    }
  }
  const { data, error } = await supabase.rpc("propose_heritage_item", { p: proposalFromNote(note, heritagePath) as Json });
  if (error || typeof data !== "string") redirect(`/workspace/${id}?error=${encodeURIComponent("It could not be sent. Please try again.")}`);
  await supabase.rpc("mark_research_note_submitted", { p_id: id, p_item_id: data });
  revalidatePath(`/workspace/${id}`);
  redirect(`/workspace/${id}?submitted=1`);
}
