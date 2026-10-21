// Steward console (docs/PRODUTO.md screen 09). Shapes of the three read
// functions in supabase/migrations/20261017090000_add_steward_console.sql and
// the demo summary in 20261017100000_add_demo_marking.sql. Counts of records,
// never scores of people.

export type CountMap = Record<string, number>;

export interface StewardOverview {
  people: { total: number; merged: number; claimed: number; deceased: number; byVerification: CountMap; bySource: CountMap };
  organizations: { total: number; byVerification: CountMap };
  participations: { total: number; undated: number; approximate: number; unconfirmed: number; ongoing: number };
  relationships: { total: number };
  contributions: { total: number };
  claimsAwaitingReview: number;
}

export interface AttentionPerson {
  id: string;
  displayName: string;
}

export interface AttentionUndated {
  id: string;
  personId: string;
  personDisplayName: string;
  organizationId: string;
  organizationName: string;
  capacity: string;
}

export interface AttentionDuplicateGroup {
  nameKey: string;
  people: AttentionPerson[];
}

export interface AttentionSection<T> {
  total: number;
  items: T[];
}

export interface StewardAttention {
  peopleWithoutParticipation: AttentionSection<AttentionPerson>;
  undatedParticipations: AttentionSection<AttentionUndated>;
  possibleDuplicates: AttentionSection<AttentionDuplicateGroup>;
}

export interface CorpusDecade {
  decade: number;
  participationsStarting: number;
  peopleStarting: number;
}

export interface DemoSummary {
  people: { demo: number; real: number };
  organizations: { demo: number; real: number };
  contributions: { demo: number; real: number };
  events: { demo: number; real: number };
}

export interface StewardScope {
  /** Platform reviewer: the whole record. */
  platform: boolean;
  /** Institutions this account stewards, alphabetical. */
  organizations: { id: string; name: string }[];
}
