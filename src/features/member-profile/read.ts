import { createClient } from "@/lib/supabase/server";

import { EMPTY_PROFILE, parseProfileRow, type MemberProfile } from "./parse";

export interface MyProfile {
  userId: string;
  email: string;
  profile: MemberProfile;
  /** Short-lived link to the photo (the bucket is private), or null. */
  photoUrl: string | null;
}

const PHOTO_LINK_SECONDS = 60 * 60;

/** The signed-in member's own profile card. Null when signed out. */
export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!userId) return null;
  const email = typeof claims?.email === "string" ? claims.email : "";

  const { data, error } = await supabase
    .from("member_profiles")
    .select("display_name, headline, location, biography, website, orcid, photo_path, visibility, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const profile = error ? EMPTY_PROFILE : parseProfileRow(data);

  let photoUrl: string | null = null;
  if (profile.photoPath) {
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(profile.photoPath, PHOTO_LINK_SECONDS);
    photoUrl = signed?.signedUrl ?? null;
  }

  return { userId, email, profile, photoUrl };
}
