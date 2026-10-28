"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { findRorLocation } from "./ror";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Looks up to 15 institutions without a location in ROR; each match becomes a proposal. */
export async function findLocationsAction(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_organizations_without_location", { p_limit: 15 });
  if (error || !Array.isArray(data)) redirect(`/review/locations?error=${encodeURIComponent("The list could not be read.")}`);
  const orgs = (data as { id: string; name: string; shortName?: string | null; ror?: string | null }[]).filter((o) => UUID.test(o.id));
  let found = 0;
  for (const o of orgs) {
    const loc = await findRorLocation(o.name, o.ror ?? null);
    if (!loc) continue;
    const { error: e } = await supabase.rpc("steward_propose_organization_location", {
      p_organization_id: o.id,
      p: { latitude: loc.latitude, longitude: loc.longitude, countryCode: loc.countryCode, city: loc.city, source: "ror", sourceUrl: loc.rorId, matchedName: loc.matchedName },
    });
    if (!e) found += 1;
  }
  revalidatePath("/review/locations");
  redirect(`/review/locations?searched=${orgs.length}&found=${found}`);
}

export async function decideLocationAction(form: FormData): Promise<void> {
  const id = String(form.get("proposalId") ?? "");
  if (!UUID.test(id)) redirect("/review/locations");
  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_decide_location_proposal", { p_id: id, p_accept: form.get("decision") === "accept" });
  if (error) redirect(`/review/locations?error=${encodeURIComponent("The decision could not be saved.")}`);
  revalidatePath("/review/locations");
  revalidatePath("/map");
  redirect("/review/locations?decided=1");
}

export async function setLocationAction(form: FormData): Promise<void> {
  const id = String(form.get("organizationId") ?? "");
  const back = `/institutions/${id}`;
  if (!UUID.test(id)) redirect("/institutions");
  const lat = Number(String(form.get("latitude") ?? "").replace(",", "."));
  const lon = Number(String(form.get("longitude") ?? "").replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || String(form.get("latitude") ?? "").trim() === "") {
    redirect(`${back}?locationError=${encodeURIComponent("Latitude and longitude as decimal numbers, e.g. -2.40 and -59.90.")}#location`);
  }
  const country = String(form.get("countryCode") ?? "").trim().toUpperCase();
  if (country !== "" && !/^[A-Z]{2}$/.test(country)) redirect(`${back}?locationError=${encodeURIComponent("Country as two letters, e.g. BR.")}#location`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("steward_set_organization_location", {
    p_organization_id: id,
    p_latitude: lat,
    p_longitude: lon,
    p_country_code: country || undefined,
    p_city: String(form.get("city") ?? "").trim() || undefined,
    p_source: String(form.get("source") ?? "").trim() || undefined,
  });
  if (error) redirect(`${back}?locationError=${encodeURIComponent("The location could not be saved.")}#location`);
  revalidatePath(back);
  revalidatePath("/map");
  redirect(`${back}?locationSaved=1#location`);
}
