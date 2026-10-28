import { askClaude, claudeIsOn } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";

import { librarianPrompt, parseSources, wordsOf, type Mode, type Source } from "./parse";

export async function findSources(question: string): Promise<Source[]> {
  const words = wordsOf(question);
  if (words.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("librarian_sources", { p_words: words });
  return error ? [] : parseSources(data);
}

export async function askLibrarian(question: string, mode: Mode, sources: Source[]): Promise<string | null> {
  if (!claudeIsOn() || sources.length === 0) return null;
  return askClaude([{ type: "text", text: librarianPrompt(question, mode, sources) }], 1800, 60_000);
}

export { claudeIsOn };
