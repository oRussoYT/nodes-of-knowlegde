// Server-only reads of the bounded Knowledge Network read models. Plain async
// functions, called directly from the /network Server Components -- the same
// pattern as the biography/timeline/participation/relationship reads. Each wraps
// one SECURITY DEFINER function (the authorization + one-hop + visibility
// boundary) and fails closed to null on any error, missing, or unrecognizable
// result. No client-side traversal, no whole-graph query -- one hop, at the
// server, per canonical record.

import { createClient } from "@/lib/supabase/server";

import { parseInstitutionalRelationshipDocument, parseNetworkDocument } from "./parse";
import type { InstitutionalRelationshipDocument, NetworkDocument } from "./types";

export async function getPersonNetwork(personId: string): Promise<NetworkDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_person_network", { p_person_id: personId });
  if (error || data === null || data === undefined) {
    return null;
  }
  return parseNetworkDocument(data);
}

export async function getOrganizationNetwork(organizationId: string): Promise<NetworkDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organization_network", {
    p_organization_id: organizationId,
  });
  if (error || data === null || data === undefined) {
    return null;
  }
  return parseNetworkDocument(data);
}

export async function getContributionNetwork(contributionId: string): Promise<NetworkDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_contribution_network", {
    p_contribution_id: contributionId,
  });
  if (error || data === null || data === undefined) {
    return null;
  }
  return parseNetworkDocument(data);
}

export async function getEventNetwork(eventId: string): Promise<NetworkDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_event_network", { p_event_id: eventId });
  if (error || data === null || data === undefined) {
    return null;
  }
  return parseNetworkDocument(data);
}

export async function getOrganizationRelationships(
  organizationId: string,
): Promise<InstitutionalRelationshipDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organization_relationships", {
    p_organization_id: organizationId,
  });
  if (error || data === null || data === undefined) {
    return null;
  }
  return parseInstitutionalRelationshipDocument(data);
}
