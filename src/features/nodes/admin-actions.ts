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
