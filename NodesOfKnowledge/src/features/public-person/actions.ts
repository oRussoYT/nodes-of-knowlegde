"use server";

// Publish / unpublish a person page. The database functions decide who may do
// it (a reviewer with a written reason, or the person themselves) and audit it.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function stewardSetPublicAction(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId") ?? "");
  const makePublic = formData.get("makePublic") === "true";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!UUID.test(personId)) redirect("/people");
  const path = `/people/${personId}`;

  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_set_person_public", {
    p_person_id: personId,
    p_public: makePublic,
    ...(reason ? { p_reason: reason } : {}),
  });

  if (error) {
    const message = error.message?.includes("a reason is required")
      ? "Write the reason for publishing this page."
      : error.message?.includes("reviewer authorization required")
        ? "Only stewards can publish someone else's page."
        : "Something went wrong. Please try again.";
    redirect(`${path}?publishError=${encodeURIComponent(message)}`);
  }

  revalidatePath(path);
  revalidatePath(`/p/${personId}`);
  redirect(path);
}

export async function setMyPagePublicAction(formData: FormData): Promise<void> {
  const makePublic = formData.get("makePublic") === "true";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_my_person_public", { p_public: makePublic });
  if (error || typeof data !== "string") {
    redirect(`/member?publishError=${encodeURIComponent("Your page could not be changed. Please try again.")}`);
  }
  revalidatePath("/member");
  revalidatePath(`/p/${data}`);
  redirect("/member");
}
