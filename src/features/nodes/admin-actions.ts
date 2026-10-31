"use server";

// Creating and shaping Nodes -- platform reviewers only; the database checks
// and audits every change. A new Node needs no code change.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { isNodeSlug } from "./parse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = "/review/nodes";

export async function createNodeAction(form: FormData): Promise<void> {
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  if (!isNodeSlug(slug)) redirect(`${PAGE}?error=${encodeURIComponent("The address uses lowercase letters, numbers and hyphens, e.g. mamiraua.")}`);
  if (name.length < 3) redirect(`${PAGE}?error=${encodeURIComponent("Write the Node's name.")}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_create_node", {
    p: {
      slug,
      name,
      shortName: String(form.get("shortName") ?? "").trim() || null,
      tagline: String(form.get("tagline") ?? "").trim() || null,
      description: String(form.get("description") ?? "").trim() || null,
      plan: form.get("plan") === "paid" ? "paid" : "pro_bono",
    },
  });
  if (error) redirect(`${PAGE}?error=${encodeURIComponent(error.message.includes("duplicate") ? "That address is taken." : "The Node could not be created.")}`);
  revalidatePath("/nodes");
  redirect(`${PAGE}?created=${slug}`);
}

export async function setNodeOrganizationAction(form: FormData): Promise<void> {
  const slug = String(form.get("slug") ?? "");
  const org = String(form.get("organizationId") ?? "");
  const role = String(form.get("role") ?? "core");
  if (!isNodeSlug(slug) || !UUID.test(org)) redirect(`${PAGE}?error=${encodeURIComponent("Choose an institution.")}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_set_node_organization", {
    p_slug: slug,
    p_organization_id: org,
    p_role: ["core", "host", "partner"].includes(role) ? role : "core",
    p_include: form.get("include") !== "0",
  });
  if (error) redirect(`${PAGE}?error=${encodeURIComponent("That could not be saved.")}`);
  revalidatePath(`/n/${slug}`);
  redirect(`${PAGE}?saved=${slug}#${slug}`);
}

export async function setNodeVocabularyAction(form: FormData): Promise<void> {
  const slug = String(form.get("slug") ?? "");
  if (!isNodeSlug(slug)) redirect(PAGE);
  const remove = String(form.get("removeId") ?? "");
  const kind = form.get("kind") === "field" ? "field" : "role";
  const label = String(form.get("label") ?? "").trim();
  if (!UUID.test(remove) && (label.length < 2 || label.length > 120)) redirect(`${PAGE}?error=${encodeURIComponent("Write the word (2 to 120 characters).")}#${slug}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_set_node_vocabulary", {
    p_slug: slug,
    p: { kind, label, baseKey: String(form.get("baseKey") ?? "") || null, description: String(form.get("description") ?? "").trim() || null },
    ...(UUID.test(remove) ? { p_remove: remove } : {}),
  });
  if (error) redirect(`${PAGE}?error=${encodeURIComponent(kind === "role" ? "Choose the common role it corresponds to." : "That could not be saved.")}#${slug}`);
  revalidatePath(`/n/${slug}`);
  redirect(`${PAGE}?saved=${slug}#${slug}`);
}
