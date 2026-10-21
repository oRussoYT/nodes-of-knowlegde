// Disposable timeline fixtures for the M6.2 e2e tests. Events and
// person_events are granted to service_role by the timeline migration
// (consistent with people/profile_claims/reviewers -- service_role is the
// trusted backend, never a client role), so the established service-role
// fixture pattern applies directly, giving each test its own isolated,
// disposable events. Institution-neutral content only.

import { getServiceRoleClient } from "./service-role";

type SourceType = "self_reported" | "nominated_by_other" | "admin_entered" | "imported_historical";
type VerificationStatus = "provisional" | "verified_self" | "verified_admin" | "disputed";
type Precision = "day" | "month" | "year" | "decade";

export interface EventInput {
  kind?: string;
  title: string;
  summary?: string;
  place?: string;
  startDate?: string;
  startPrecision?: Precision;
  endDate?: string;
  endPrecision?: Precision;
  isApproximate?: boolean;
  isOngoing?: boolean;
  dateIsUnknown?: boolean;
  dateIsUncertain?: boolean;
  sourceType?: SourceType;
  verificationStatus?: VerificationStatus;
}

/**
 * Creates an event and projects it onto a person's timeline. Fills in a
 * coherent temporal shape: a dated event defaults to year precision; an
 * undated event clears the date fields. Throws if neither a start date nor
 * dateIsUnknown is given (the schema forbids a silently dateless event).
 * Returns the new event id (track it for cleanup with deleteEvent).
 */
export async function addEvent(personId: string, input: EventInput): Promise<string> {
  const supabase = getServiceRoleClient();

  const dateIsUnknown = input.dateIsUnknown ?? false;
  const startDate = dateIsUnknown ? null : input.startDate ?? null;
  const startPrecision = dateIsUnknown ? null : startDate ? input.startPrecision ?? "year" : null;
  const endDate = input.endDate ?? null;
  const endPrecision = endDate ? input.endPrecision ?? "year" : null;

  if (!dateIsUnknown && startDate === null) {
    throw new Error("addEvent: an event needs either a startDate or dateIsUnknown");
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      event_kind: input.kind ?? "other",
      title: input.title,
      summary: input.summary ?? null,
      place: input.place ?? null,
      start_date: startDate,
      start_precision: startPrecision,
      end_date: endDate,
      end_precision: endPrecision,
      is_approximate: input.isApproximate ?? false,
      is_ongoing: input.isOngoing ?? false,
      date_is_unknown: dateIsUnknown,
      date_is_uncertain: input.dateIsUncertain ?? false,
      source_type: input.sourceType ?? "imported_historical",
      verification_status: input.verificationStatus ?? "provisional",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`addEvent: ${error.message}`);
  }

  const { error: linkError } = await supabase
    .from("person_events")
    .insert({ person_id: personId, event_id: data.id });

  if (linkError) {
    throw new Error(`addEvent (link): ${linkError.message}`);
  }

  return data.id;
}

/** Deletes an event (person_events cascades on the event delete). */
export async function deleteEvent(id: string): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    throw new Error(`deleteEvent: ${error.message}`);
  }
}
