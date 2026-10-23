import { createClient } from "@/lib/supabase/server";

import { parseContactOptions, parseMessages, type ContactOptions, type Message } from "./parse";

export async function getMyMessages(): Promise<Message[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_messages");
  return error ? [] : parseMessages(data);
}

export async function markMyMessagesRead(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("mark_messages_read");
}

export async function getUnreadMessageCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unread_message_count");
  return error || typeof data !== "number" ? 0 : data;
}

export async function getContactOptions(personId: string): Promise<ContactOptions> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("person_contact_options", { p_person_id: personId });
  return parseContactOptions(error ? null : data);
}
