// The outcomes panel (supabase/migrations/20261017150000_add_outcomes.sql).

export interface OutcomeTotals {
  graduates: number;
  found: number;
  probable: number;
  needsPerson: number;
  demo: number;
}

export interface OutcomesDocument {
  organizationId: string;
  filters: { programme: string | null; fromYear: number | null; toYear: number | null };
  totals: OutcomeTotals;
  timeSaved: { minutesPerPerson: number; minutes: number; minutesRemaining: number; basis: string };
  byYear: { year: number | null; graduates: number; found: number }[];
  byProgramme: { programme: string | null; graduates: number; found: number }[];
  byDegree: { degree: string | null; graduates: number; found: number }[];
  bySector: { sector: string; people: number }[];
  byCountry: { country: string | null; people: number }[];
  destinations: { institution: string; people: number }[];
  programmes: string[];
}

export interface OutcomeExportRow {
  personId: string;
  displayName: string;
  graduationYear: number | null;
  programme: string | null;
  degree: string | null;
  status: string;
  destinationInstitution: string | null;
  destinationType: string | null;
  destinationCountry: string | null;
  destinationYear: number | null;
  destinationSource: string | null;
  confirmedAt: string | null;
  orcid: string | null;
  isDemo: boolean;
}

export interface OutcomeFilters {
  programme?: string;
  fromYear?: number;
  toYear?: number;
}
