"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { askClaude, claudeIsOn, firstJsonObject } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { TOPIC_KINDS, parseTopicSuggestions, splitTopics, topicPrompt, type TopicKind } from "./parse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = "/member/connections";

async function myPerson(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_linked_person");
  return typeof data === "string" ? data : null;
}

export async function addTopicsAction(form: FormData): Promise<void> {
  const kind = String(form.get("kind") ?? "theme") as TopicKind;
  if (!TOPIC_KINDS.some((k) => k.key === kind)) redirect(PAGE);
  const topics = splitTopics(String(form.get("labels") ?? ""), kind);
  if (topics.length === 0) redirect(`${PAGE}?error=${encodeURIComponent("Write at least one topic (2 to 120 characters).")}`);
  const me = await myPerson();
  if (!me) redirect(PAGE);
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_person_topics", { p_person_id: me, p_topics: topics as unknown as Json, p_source: "person" });
  if (error) redirect(`${PAGE}?error=${encodeURIComponent("The topics could not be saved.")}`);
  revalidatePath(PAGE);
  redirect(`${PAGE}?saved=1`);
}

export async function decideTopicAction(form: FormData): Promise<void> {
  const id = String(form.get("topicId") ?? "");
  if (!UUID.test(id)) redirect(PAGE);
  const supabase = await createClient();
  const decision = String(form.get("decision") ?? "");
  const { error } =
    decision === "remove"
      ? await supabase.rpc("remove_person_topic", { p_topic_id: id })
      : await supabase.rpc("decide_person_topic", { p_topic_id: id, p_confirm: decision === "confirm" });
  if (error) redirect(`${PAGE}?error=${encodeURIComponent("That could not be saved.")}`);
  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function suggestTopicsAction(): Promise<void> {
  if (!claudeIsOn()) redirect(`${PAGE}?error=${encodeURIComponent("AI suggestions are not switched on yet.")}`);
  const me = await myPerson();
  if (!me) redirect(PAGE);
  const supabase = await createClient();
  const { data } = await supabase.rpc("person_topic_material", { p_person_id: me });
  const material = (data ?? {}) as { name?: string; works?: string[]; institutions?: string[]; history?: string[] };
  if ((material.works ?? []).length === 0 && (material.history ?? []).length === 0) {
    redirect(`${PAGE}?error=${encodeURIComponent("Your record has no works or history items yet for the AI to read.")}`);
  }
  const answer = await askClaude([{ type: "text", text: topicPrompt(material) }], 1500);
  const topics = answer ? parseTopicSuggestions(firstJsonObject(answer)) : [];
  if (topics.length === 0) redirect(`${PAGE}?error=${encodeURIComponent("The AI had no suggestions this time.")}`);
  await supabase.rpc("add_person_topics", { p_person_id: me, p_topics: topics as unknown as Json, p_source: "ai" });
  revalidatePath(PAGE);
  redirect(`${PAGE}?suggested=${topics.length}`);
}
