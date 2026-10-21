"use server";

// Add / remove an institution's other names. The database enforces that only
// the institution's stewards (or platform reviewers) can, and audits each one.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { readNameForm } from "./parse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pathFor(organizationId: string): string {
  return UUID.test(organizationId) ? `/review/names?org=${organizationId}` : "/review/names";
}

function back(organizationId: string, message: string): never {
  const path = pathFor(organizationId);
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

function friendly(raw: string): string {
  if (raw.includes("reviewer authorization required")) return "Only this institution's stewards can do this.";
  const known = raw.match(/steward_[a-z_]+: (.+)$/);
  const text = known?.[1];
  return text ? text.charAt(0).toUpperCase() + text.slice(1) + "." : "Something went wrong. Please try again.";
}

export async function addOrganizationNameAction(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "");
  if (!UUID.test(organizationId)) back("", "Choose an institution.");
  const form = readNameForm({
    name: String(formData.get("name") ?? ""),
    nameType: String(formData.get("nameType") ?? ""),
    language: String(formData.get("language") ?? ""),
    startYear: String(formData.get("startYear") ?? ""),
    endYear: String(formData.get("endYear") ?? ""),
  });
  if (!form.ok) back(organizationId, form.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_add_organization_name", {
    p_organization_id: organizationId,
    p_name: form.value.name,
    p_name_type: form.value.nameType,
    ...(form.value.language ? { p_language: form.value.language } : {}),
    ...(form.value.startYear !== null ? { p_start_year: form.value.startYear } : {}),
    ...(form.value.endYear !== null ? { p_end_year: form.value.endYear } : {}),
  });
  if (error) back(organizationId, friendly(error.message ?? ""));
  revalidatePath("/review/names");
  revalidatePath(`/institutions/${organizationId}`);
  redirect(pathFor(organizationId));
}

export async function removeOrganizationNameAction(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const nameId = String(formData.get("nameId") ?? "");
  if (!UUID.test(nameId)) back(organizationId, "Something went wrong. Please try again.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_remove_organization_name", { p_name_id: nameId });
  if (error) back(organizationId, friendly(error.message ?? ""));
  revalidatePath("/review/names");
  if (UUID.test(organizationId)) revalidatePath(`/institutions/${organizationId}`);
  redirect(pathFor(organizationId));
}
