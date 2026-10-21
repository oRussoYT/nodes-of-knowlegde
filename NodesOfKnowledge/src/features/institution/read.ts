// Server-only reads for the Institution page -- three bounded, independently
// evolving reads composed at the page (the M6.1-M6.4 discipline). Each wraps a
// SECURITY DEFINER function (the authorization + visibility boundary) and fails
// closed to null on any error, missing, or unrecognizable result.

import { createClient } from "@/lib/supabase/server";
import { parseTimelineDocument } from "@/features/timeline/parse";
import type { TimelineDocument } from "@/features/timeline/types";

import { parseInstitutionParticipationDocument, parseOrganization } from "./parse";
import type { InstitutionParticipationDocument, Organization } from "./types";

export async function getOrganization(organizationId: string): Promise<Organization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organization", { p_organization_id: organizationId });
  if (error || data === null || data === undefined) {
    return null;
  }
  return parseOrganization(data);
}

// The institution timeline is the SAME canonical Event shape as a person
// timeline (M6.2), so it reuses the M6.2 timeline parser and components. The
// read function returns { organization_id, events }; we adapt it to a
// TimelineDocument keyed by the institution as subject. Events are projected
// (organization_events), never copied.
export async function getOrganizationTimeline(organizationId: string): Promise<TimelineDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organization_timeline", { p_organization_id: organizationId });
  if (error || data === null || data === undefined) {
    return null;
  }
  const events = typeof data === "object" && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>).events
    : undefined;
  return parseTimelineDocument({ person_id: organizationId, events });
}

export async function getOrganizationParticipation(organizationId: string): Promise<InstitutionParticipationDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organization_participation", { p_organization_id: organizationId });
  if (error || data === null || data === undefined) {
    return null;
  }
  return parseInstitutionParticipationDocument(data);
}
