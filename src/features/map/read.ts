import { createClient } from "@/lib/supabase/server";

import { parseMap, parseMovements, type MapDocument, type Movement } from "./parse";

export async function getMapPlaces(year: number | null): Promise<MapDocument> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("map_places", year === null ? {} : { p_year: year });
  return parseMap(error ? null : data);
}

export async function getMapToday(): Promise<{ countryCode: string; people: number }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("map_today");
  const list = !error && data && typeof data === "object" && !Array.isArray(data) ? (data as { byCountry?: unknown }).byCountry : null;
  return Array.isArray(list)
    ? list.flatMap((r) =>
        r && typeof r === "object" && typeof (r as { countryCode?: unknown }).countryCode === "string"
          ? [{ countryCode: (r as { countryCode: string }).countryCode, people: Number((r as { people?: unknown }).people) || 0 }]
          : [],
      )
    : [];
}

export async function getMovements(): Promise<Movement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("map_movements");
  return error ? [] : parseMovements(data);
}

export interface LocationProposal {
  id: string;
  organizationId: string;
  organizationName: string;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  city: string | null;
  sourceUrl: string | null;
  matchedName: string | null;
}

export async function getLocationProposals(): Promise<LocationProposal[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_list_location_proposals");
  if (error || !Array.isArray(data)) return error ? null : [];
  return data.flatMap((r) => {
    const o = r as Record<string, unknown>;
    return typeof o.id === "string" && typeof o.latitude === "number" && typeof o.longitude === "number"
      ? [
          {
            id: o.id,
            organizationId: String(o.organizationId),
            organizationName: String(o.organizationName ?? ""),
            latitude: o.latitude,
            longitude: o.longitude,
            countryCode: typeof o.countryCode === "string" ? o.countryCode : null,
            city: typeof o.city === "string" ? o.city : null,
            sourceUrl: typeof o.sourceUrl === "string" ? o.sourceUrl : null,
            matchedName: typeof o.matchedName === "string" ? o.matchedName : null,
          },
        ]
      : [];
  });
}

export interface OrganizationLocation {
  latitude: number | null;
  longitude: number | null;
  countryCode: string | null;
  city: string | null;
  source: string | null;
  canEdit: boolean;
}

export async function getOrganizationLocation(organizationId: string): Promise<OrganizationLocation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organization_location", { p_organization_id: organizationId });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" ? v : null);
  const s = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
  return { latitude: n(o.latitude), longitude: n(o.longitude), countryCode: s(o.countryCode), city: s(o.city), source: s(o.source), canEdit: o.canEdit === true };
}
