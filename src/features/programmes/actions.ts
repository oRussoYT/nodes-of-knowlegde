"use server";

// A steward publishes or unpublishes their institution's programme pages.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setOutcomesPublicAction(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const makePublic = formData.get("makePublic") === "true";
  if (!UUID.test(organizationId)) redirect("/review/outcomes");
  const supabase = await createClient();
  await supabase.rpc("steward_set_outcomes_public", { p_organization_id: organizationId, p_public: makePublic });
  revalidatePath("/review/outcomes");
  revalidatePath("/programmes");
  redirect(`/review/outcomes?org=${organizationId}`);
}
