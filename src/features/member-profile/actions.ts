"use server";

// Saving a member's own profile card. Row Level Security (member_profiles,
// storage bucket 'avatars') is the real boundary: a member can only write
// their own row and their own photo folder. These actions add clear messages.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { isOwnPhotoPath, parseProfileForm } from "./parse";

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}

function back(query: string): never {
  redirect(`/profile?${query}`);
}

export async function saveProfileAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  if (!userId) redirect("/login?returnTo=%2Fprofile");

  const parsed = parseProfileForm(formData);
  if (!parsed.ok) back(`error=${encodeURIComponent(parsed.error)}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("member_profiles")
    .upsert({ user_id: userId, ...parsed.values }, { onConflict: "user_id" });
  if (error) back(`error=${encodeURIComponent("Your profile could not be saved. Please try again.")}`);

  revalidatePath("/", "layout");
  back("saved=1");
}

/**
 * Called by the photo uploader after the browser has put the new photo in
 * the member's own folder. Points the profile at it and removes the old one.
 * Returns an error message, or null on success.
 */
export async function setProfilePhotoAction(path: string): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) return "Please sign in again.";
  if (!isOwnPhotoPath(path, userId)) return "That photo could not be used.";

  const supabase = await createClient();
  const { data: before } = await supabase.from("member_profiles").select("photo_path").eq("user_id", userId).maybeSingle();
  const { error } = await supabase
    .from("member_profiles")
    .upsert({ user_id: userId, photo_path: path }, { onConflict: "user_id" });
  if (error) return "The photo could not be saved. Please try again.";

  const old = before?.photo_path;
  if (old && old !== path) await supabase.storage.from("avatars").remove([old]);

  revalidatePath("/", "layout");
  return null;
}

export async function removeProfilePhotoAction(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) redirect("/login?returnTo=%2Fprofile");

  const supabase = await createClient();
  const { data: before } = await supabase.from("member_profiles").select("photo_path").eq("user_id", userId).maybeSingle();
  const old = before?.photo_path;
  const { error } = await supabase.from("member_profiles").update({ photo_path: null }).eq("user_id", userId);
  if (error) back(`error=${encodeURIComponent("The photo could not be removed. Please try again.")}`);
  if (old) await supabase.storage.from("avatars").remove([old]);

  revalidatePath("/", "layout");
  back("saved=1");
}
