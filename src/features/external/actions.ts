"use server";

// Look graduates up in OpenAlex and record the explained proposals; accept or
// reject a proposal. The database gates and audits; this only fetches.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { listImportBatches } from "@/features/import/read";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { proposeFromOpenAlex, searchOpenAlexAuthors } from "./openalex";
import { getExternalBatch } from "./read";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ROWS_PER_RUN = 40;

function back(batchId: string, key: "error" | "notice", message: string): never {
  redirect(`/review/import/${batchId}?${key}=${encodeURIComponent(message)}`);
}

export async function lookUpBatchInOpenAlexAction(formData: FormData): Promise<void> {
  const batchId = String(formData.get("batchId") ?? "");
  if (!UUID.test(batchId)) redirect("/review/import");

  const [doc, batches] = await Promise.all([getExternalBatch(batchId), listImportBatches()]);
  if (!doc) back(batchId, "error", "This list could not be read.");
  const institution = batches.find((b) => b.id === batchId)?.organizationName ?? null;

  // Rows not skipped and without a decided proposal yet.
  const todo = doc.rows
    .filter((r) => r.status !== "skipped" && !r.matches.some((m) => m.status !== "proposed"))
    .slice(0, MAX_ROWS_PER_RUN);

  const supabase = await createClient();
  let looked = 0;
  let found = 0;
  let failed = 0;
  for (const row of todo) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await searchOpenAlexAuthors(row, controller.signal);
    clearTimeout(timer);
    if (response === null) {
      failed += 1;
      continue;
    }
    const proposals = proposeFromOpenAlex(response, row, institution).map((c) => ({
      externalId: c.externalId,
      displayName: c.displayName,
      orcid: c.orcid,
      lastKnownInstitution: c.lastKnownInstitution,
      lastKnownCountry: c.lastKnownCountry,
      lastKnownType: c.lastKnownType,
      affiliations: c.affiliations,
      worksCount: c.worksCount,
      reasons: c.reasons,
    }));
    const { error } = await supabase.rpc("steward_record_external_matches", {
      p_row_id: row.id,
      p_source: "openalex",
      p_matches: proposals as unknown as Json,
    });
    if (error) {
      failed += 1;
      continue;
    }
    looked += 1;
    if (proposals.length > 0) found += 1;
  }

  revalidatePath(`/review/import/${batchId}`);
  const remaining = doc.rows.filter((r) => r.status !== "skipped" && !r.matches.some((m) => m.status !== "proposed")).length - todo.length;
  back(
    batchId,
    "notice",
    `Looked up ${looked} people in OpenAlex; ${found} have possible matches.` +
      (failed ? ` ${failed} could not be looked up — try again.` : "") +
      (remaining > 0 ? ` ${remaining} more to go — run it again.` : ""),
  );
}

export async function decideExternalMatchAction(formData: FormData): Promise<void> {
  const batchId = String(formData.get("batchId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const accept = formData.get("accept") === "true";
  if (!UUID.test(batchId) || !UUID.test(matchId)) redirect("/review/import");

  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_decide_external_match", { p_match_id: matchId, p_accept: accept });
  if (error) {
    back(
      batchId,
      "error",
      error.message?.includes("decide who this row is first")
        ? "First decide who this row is (same person / new person), then accept the match."
        : error.message?.includes("already decided")
          ? "That proposal was already decided."
          : "Something went wrong. Please try again.",
    );
  }
  revalidatePath(`/review/import/${batchId}`);
  redirect(`/review/import/${batchId}`);
}

export async function undoExternalMatchAction(formData: FormData): Promise<void> {
  const batchId = String(formData.get("batchId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!UUID.test(batchId) || !UUID.test(matchId)) redirect("/review/import");
  if (!reason) back(batchId, "error", "Say why the match was wrong, then undo it.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_undo_external_match", { p_match_id: matchId, p_reason: reason });
  if (error) {
    back(
      batchId,
      "error",
      error.message?.includes("only an accepted match")
        ? "Only an accepted match can be undone."
        : error.message?.includes("reviewer authorization required")
          ? "Only this institution's stewards can do this."
          : "Something went wrong. Please try again.",
    );
  }
  revalidatePath(`/review/import/${batchId}`);
  back(batchId, "notice", "Undone. The other proposals for this person are back for you to choose.");
}
