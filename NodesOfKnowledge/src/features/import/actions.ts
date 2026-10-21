"use server";

// Server Actions for the import screens. Plain <form action> targets (no
// client JavaScript needed). Errors come back to the page as a short message
// in the query string; the database functions do the authorization.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { parseGraduateCsv } from "./csv";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function friendly(raw: string): string {
  if (raw.includes("reviewer authorization required")) return "Only stewards can do this.";
  const known = raw.match(/steward_[a-z_]+: (.+)$/);
  return known ? known[1].charAt(0).toUpperCase() + known[1].slice(1) + "." : "Something went wrong. Please try again.";
}

export async function createImportBatchAction(formData: FormData): Promise<void> {
  const label = String(formData.get("label") ?? "").trim();
  const organizationRaw = String(formData.get("organizationId") ?? "").trim();
  const organizationId = UUID.test(organizationRaw) ? organizationRaw : null;

  let text = String(formData.get("csvText") ?? "");
  const file = formData.get("csvFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) back("/review/import", "The file is larger than 5 MB.");
    text = await file.text();
  }

  if (!label) back("/review/import", "Give the list a name.");
  if (!text.trim()) back("/review/import", "Choose a CSV file or paste the list.");

  const parsed = parseGraduateCsv(text);
  if (parsed.problems.length > 0) back("/review/import", parsed.problems.slice(0, 3).join(" "));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_create_import_batch", {
    p_label: label,
    p_organization_id: organizationId,
    p_rows: parsed.rows as unknown as Json,
  });

  if (error || typeof data !== "string") back("/review/import", friendly(error?.message ?? ""));

  revalidatePath("/review/import");
  redirect(`/review/import/${data}`);
}

export async function resolveImportRowAction(formData: FormData): Promise<void> {
  const batchId = String(formData.get("batchId") ?? "");
  const rowId = String(formData.get("rowId") ?? "");
  const action = String(formData.get("decision") ?? "");
  const personRaw = String(formData.get("personId") ?? "");
  const path = UUID.test(batchId) ? `/review/import/${batchId}` : "/review/import";

  if (!UUID.test(rowId) || !["match", "create", "skip"].includes(action)) back(path, "Something went wrong. Please try again.");
  if (action === "match" && !UUID.test(personRaw)) back(path, "Choose the person this row is.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_resolve_import_row", {
    p_row_id: rowId,
    p_action: action,
    ...(action === "match" ? { p_person_id: personRaw } : {}),
  });

  if (error) back(path, friendly(error.message ?? ""));

  revalidatePath(path);
  redirect(path);
}
