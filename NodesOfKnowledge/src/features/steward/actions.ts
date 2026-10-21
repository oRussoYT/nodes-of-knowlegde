"use server";

// Appoint / remove institution stewards (ROTEIRO etapa 3). Platform reviewers
// only -- the database enforces it and audits each change.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PATH = "/review/stewards";

function back(message: string): never {
  redirect(`${PATH}?error=${encodeURIComponent(message)}`);
}

export async function grantInstitutionStewardAction(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  if (!UUID.test(organizationId)) back("Choose an institution.");
  if (!email) back("Write the email of the account to appoint.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_grant_institution_steward", {
    p_organization_id: organizationId,
    p_email: email,
  });
  if (error) {
    const raw = error.message ?? "";
    back(
      raw.includes("no account with that email")
        ? "No account uses that email yet. Ask the person to register first."
        : raw.includes("cannot appoint yourself")
          ? "You cannot appoint yourself."
          : raw.includes("reviewer authorization required")
            ? "Only platform reviewers can appoint stewards."
            : "Something went wrong. Please try again.",
    );
  }
  revalidatePath(PATH);
  redirect(PATH);
}

export async function revokeInstitutionStewardAction(formData: FormData): Promise<void> {
  const stewardId = String(formData.get("stewardId") ?? "");
  if (!UUID.test(stewardId)) back("Something went wrong. Please try again.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_revoke_institution_steward", { p_steward_id: stewardId });
  if (error) back("That appointment could not be removed. It may already have been removed.");
  revalidatePath(PATH);
  redirect(PATH);
}
