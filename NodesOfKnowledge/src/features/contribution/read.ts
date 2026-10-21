// Server-only reads for the Contribution surfaces -- bounded, independently
// evolving reads composed at each page (the M6.1-M6.5 discipline). Each wraps a
// SECURITY DEFINER function (the authorization + visibility boundary) and fails
// closed to null on any error, missing, or unrecognizable result.

import { createClient } from "@/lib/supabase/server";
import { parseTimelineDocument } from "@/features/timeline/parse";
import type { TimelineDocument } from "@/features/timeline/types";

import {
  parseContribution,
  parseOrganizationContributionsDocument,
  parsePersonContributionsDocument,
} from "./parse";
import type { Contribution, OrganizationContributionsDocument, PersonContributionsDocument } from "./types";

export async function getContribution(contributionId: string): Promise<Contribution | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_contribution", { p_contribution_id: contributionId });
  if (error || data === null || data === undefined) {
    return null;
  }
  return parseContribution(data);
}

// The contribution timeline is the SAME canonical Event shape as a person or
// institution timeline (M6.2), so it reuses the M6.2 timeline parser and
// components. The read function returns { contribution_id, events }; we adapt it
// to a TimelineDocument keyed by the contribution as subject. Events are
// projected (contribution_events), never copied.
export async function getContributionTimeline(contributionId: string): Promise<TimelineDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_contribution_timeline", { p_contribution_id: contributionId });
  if (error || data === null || data === undefined) {
    return null;
  }
  const events =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>).events
      : undefined;
  return parseTimelineDocument({ person_id: contributionId, events });
}

export async function getPersonContributions(personId: string): Promise<PersonContributionsDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_person_contributions", { p_person_id: personId });
  if (error || data === null || data === undefined) {
    return null;
  }
  return parsePersonContributionsDocument(data);
}

export async function getOrganizationContributions(organizationId: string): Promise<OrganizationContributionsDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organization_contributions", { p_organization_id: organizationId });
  if (error || data === null || data === undefined) {
    return null;
  }
  return parseOrganizationContributionsDocument(data);
}
