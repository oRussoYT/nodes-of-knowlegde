import { createClient } from "@/lib/supabase/server";

import { parseConnections, parseTopics, type Topic } from "./parse";

export async function getMyConnections() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_topic_connections");
  return parseConnections(error ? null : data);
}

export async function getPersonTopics(personId: string): Promise<Topic[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("person_topics_json", { p_person_id: personId });
  return error ? [] : parseTopics(data);
}
