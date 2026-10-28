"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isNodeSlug } from "@/features/nodes/parse";
import { createClient } from "@/lib/supabase/server";

import { checkPost } from "./parse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function startThreadAction(form: FormData): Promise<void> {
  const slug = String(form.get("slug") ?? "");
  if (!isNodeSlug(slug)) redirect("/nodes");
  const title = String(form.get("title") ?? "");
  const body = String(form.get("body") ?? "");
  const check = checkPost(title, body);
  if (!check.ok) redirect(`/forum/${slug}?error=${encodeURIComponent(check.error)}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("forum_start_thread", { p_slug: slug, p_title: title, p_body: body });
  if (error || typeof data !== "string") redirect(`/forum/${slug}?error=${encodeURIComponent("Join the Node to write here.")}`);
  revalidatePath(`/forum/${slug}`);
  redirect(`/forum/thread/${data}`);
}

export async function replyAction(form: FormData): Promise<void> {
  const id = String(form.get("threadId") ?? "");
  if (!UUID.test(id)) redirect("/nodes");
  const body = String(form.get("body") ?? "");
  const check = checkPost(null, body);
  if (!check.ok) redirect(`/forum/thread/${id}?error=${encodeURIComponent(check.error)}#reply`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("forum_reply", { p_thread_id: id, p_body: body });
  if (error) redirect(`/forum/thread/${id}?error=${encodeURIComponent("The reply could not be sent.")}#reply`);
  revalidatePath(`/forum/thread/${id}`);
  redirect(`/forum/thread/${id}#reply`);
}

export async function hidePostAction(form: FormData): Promise<void> {
  const id = String(form.get("postId") ?? "");
  const thread = String(form.get("threadId") ?? "");
  if (UUID.test(id)) {
    const supabase = await createClient();
    await supabase.rpc("forum_hide_post", { p_post_id: id });
  }
  revalidatePath(`/forum/thread/${thread}`);
  redirect(UUID.test(thread) ? `/forum/thread/${thread}` : "/nodes");
}
