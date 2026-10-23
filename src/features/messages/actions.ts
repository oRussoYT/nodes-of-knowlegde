"use server";

// Sending and replying. The database decides who may receive a message
// (linked account + opted in), limits volume, and never exposes an email.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { checkMessage } from "./parse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function friendly(message: string | undefined): string {
  if (message?.includes("daily message limit")) return "You reached today's limit of 20 messages. Try again tomorrow.";
  if (message?.includes("does not accept messages")) return "This person does not accept messages here.";
  return "The message could not be sent. Please try again.";
}

export async function sendMessageAction(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId") ?? "");
  if (!UUID.test(personId)) redirect("/people");
  const path = `/people/${personId}`;
  const check = checkMessage(formData.get("body"));
  if (!check.ok) redirect(`${path}?messageError=${encodeURIComponent(check.error)}#contact`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message_to_person", { p_person_id: personId, p_body: check.body });
  if (error) redirect(`${path}?messageError=${encodeURIComponent(friendly(error.message))}#contact`);
  redirect(`${path}?messageSent=1#contact`);
}

export async function replyMessageAction(formData: FormData): Promise<void> {
  const messageId = String(formData.get("messageId") ?? "");
  if (!UUID.test(messageId)) redirect("/messages");
  const check = checkMessage(formData.get("body"));
  if (!check.ok) redirect(`/messages?error=${encodeURIComponent(check.error)}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_message", { p_message_id: messageId, p_body: check.body });
  if (error) redirect(`/messages?error=${encodeURIComponent(friendly(error.message))}`);
  revalidatePath("/messages");
  redirect("/messages?sent=1");
}
