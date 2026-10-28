"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isCurrentUserSteward } from "@/features/review/authorization";
import { askClaude, claudeIsOn, firstJsonObject } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { callFromAi, callPrompt, callsFromGrantsGov, pageText, parseCallForm } from "./parse";

const PAGE = "/review/funding";

export async function saveCallAction(form: FormData): Promise<void> {
  const parsed = parseCallForm(form);
  if (!parsed.ok) redirect(`${PAGE}?error=${encodeURIComponent(parsed.error)}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_funding_call", { p: parsed.payload as Json });
  if (error) redirect(`${PAGE}?error=${encodeURIComponent("The call could not be saved.")}`);
  revalidatePath("/funding");
  redirect(`${PAGE}?saved=1`);
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function importGrantsGovAction(form: FormData): Promise<void> {
  if (!(await isCurrentUserSteward())) redirect(PAGE);
  const theme = String(form.get("theme") ?? "").trim().slice(0, 100);
  if (theme.length < 3) redirect(`${PAGE}?error=${encodeURIComponent("Write a theme to search for.")}`);
  const r = await fetchWithTimeout(
    "https://api.grants.gov/v1/api/search2",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ keyword: theme, oppStatuses: "forecasted|posted", rows: 15 }) },
    12_000,
  );
  const json = r && r.ok ? await r.json().catch(() => null) : null;
  if (json === null) redirect(`${PAGE}?error=${encodeURIComponent("Grants.gov could not be reached. Try again later.")}`);
  const calls = callsFromGrantsGov(json, theme);
  const supabase = await createClient();
  let saved = 0;
  for (const c of calls) {
    const { error } = await supabase.rpc("save_funding_call", { p: c as Json });
    if (!error) saved += 1;
  }
  revalidatePath("/funding");
  redirect(`${PAGE}?imported=${saved}`);
}

export async function readCallPageAction(form: FormData): Promise<void> {
  if (!(await isCurrentUserSteward())) redirect(PAGE);
  const url = String(form.get("url") ?? "").trim();
  if (!/^https:\/\/\S+$/i.test(url)) redirect(`${PAGE}?error=${encodeURIComponent("Give the call's page (https://…).")}`);
  if (!claudeIsOn()) redirect(`${PAGE}?error=${encodeURIComponent("AI reading is not switched on yet.")}`);
  const r = await fetchWithTimeout(url, { headers: { Accept: "text/html" } }, 12_000);
  const html = r && r.ok ? await r.text().catch(() => "") : "";
  if (html === "") redirect(`${PAGE}?error=${encodeURIComponent("That page could not be opened from the server.")}`);
  const answer = await askClaude([{ type: "text", text: callPrompt(url, pageText(html)) }], 1500);
  const call = answer ? callFromAi(firstJsonObject(answer), url) : null;
  if (!call || (call.themes as string[]).length === 0) redirect(`${PAGE}?error=${encodeURIComponent("The AI could not read a call with themes from that page. Enter it by hand.")}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_funding_call", { p: call as Json });
  if (error) redirect(`${PAGE}?error=${encodeURIComponent("The call could not be saved.")}`);
  revalidatePath("/funding");
  redirect(`${PAGE}?read=1`);
}

export async function closeCallAction(form: FormData): Promise<void> {
  const id = String(form.get("callId") ?? "");
  const supabase = await createClient();
  await supabase.rpc("steward_set_funding_call_status", { p_id: id, p_status: "withdrawn" });
  revalidatePath("/funding");
  redirect(PAGE);
}
