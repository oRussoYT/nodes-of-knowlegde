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

const INSTITUTION_KINDS = new Set(["university", "research_institute", "field_station", "museum", "government_agency", "other"]);

export async function createInstitutionAction(formData: FormData): Promise<void> {
  const name = String(formData.get("institutionName") ?? "").trim();
  const kind = String(formData.get("institutionType") ?? "university");
  const location = String(formData.get("institutionLocation") ?? "").trim();
  const website = String(formData.get("institutionWebsite") ?? "").trim();
  if (!name) back("Write the institution's name.");
  if (!INSTITUTION_KINDS.has(kind)) back("Choose what kind of institution it is.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_create_organization", {
    p_name: name,
    p_organization_type: kind,
    ...(location ? { p_location: location } : {}),
    ...(website ? { p_website: website } : {}),
  });
  if (error) {
    const raw = error.message ?? "";
    back(
      raw.includes("already exists")
        ? "An institution with this name already exists."
        : raw.includes("website must start")
          ? "The website must start with http:// or https://."
          : raw.includes("reviewer authorization required")
            ? "Only platform reviewers can add institutions."
            : "Something went wrong. Please try again.",
    );
  }
  revalidatePath(PATH);
  redirect(`${PATH}?added=1`);
}
