import { createClient } from "@/lib/supabase/server";

import { parseNote, parseNotes, type ResearchNote } from "./parse";

export async function getMyNotes(query: string | null): Promise<ResearchNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_research_notes", query ? { p_query: query } : {});
  return error ? [] : parseNotes(data);
}

export async function getMyNote(id: string): Promise<{ note: ResearchNote; fileUrl: string | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_research_note", { p_id: id });
  const note = error ? null : parseNote(data);
  if (!note) return null;
  let fileUrl: string | null = null;
  if (note.filePath) fileUrl = (await supabase.storage.from("workspace").createSignedUrl(note.filePath, 3600)).data?.signedUrl ?? null;
  return { note, fileUrl };
}
