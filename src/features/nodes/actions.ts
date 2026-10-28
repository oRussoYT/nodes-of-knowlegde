"use server";

// Joining or leaving a Node: the account's own act. The database checks the
// session; signed-out visitors are sent to log in and come back.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { isNodeSlug } from "./parse";

export async function joinNodeAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const back = String(formData.get("back") ?? "");
  if (!isNodeSlug(slug)) redirect("/nodes");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/login?returnTo=${encodeURIComponent(`/n/${slug}`)}`);
  const { error } = await supabase.rpc("join_node", { p_slug: slug });
  if (error) redirect(`/n/${slug}?error=${encodeURIComponent("You could not join right now. Please try again.")}`);
  revalidatePath(`/n/${slug}`);
  revalidatePath("/member");
  redirect(back === "member" ? "/member?joined=1" : `/n/${slug}?joined=1`);
}

export async function leaveNodeAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  if (!isNodeSlug(slug)) redirect("/nodes");
  const supabase = await createClient();
  await supabase.rpc("leave_node", { p_slug: slug });
  revalidatePath(`/n/${slug}`);
  revalidatePath("/member");
  redirect(`/n/${slug}`);
}
