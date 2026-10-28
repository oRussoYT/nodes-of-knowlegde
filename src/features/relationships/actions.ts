"use server";

// Hide a documented link from one's OWN page, or bring it back. The record
// keeps the link and its sources; the database checks that the caller is the
// person the link is about.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setRelationshipHiddenAction(formData: FormData): Promise<void> {
  const relationshipId = String(formData.get("relationshipId") ?? "");
  const personId = String(formData.get("personId") ?? "");
  const hidden = formData.get("hidden") === "true";
  if (!UUID.test(relationshipId) || !UUID.test(personId)) redirect("/people");
  const supabase = await createClient();
  await supabase.rpc("set_relationship_hidden", { p_relationship_id: relationshipId, p_hidden: hidden });
  revalidatePath(`/people/${personId}`);
  redirect(`/people/${personId}#relationships`);
}
