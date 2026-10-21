// Proposals from open sources attached to import rows
// (supabase/migrations/20261017140000_add_external_matching.sql).

import type { ExternalAffiliation } from "./openalex";

export interface StoredExternalMatch {
  id: string;
  source: "openalex";
  externalId: string;
  displayName: string;
  orcid: string | null;
  lastKnownInstitution: string | null;
  lastKnownCountry: string | null;
  affiliations: ExternalAffiliation[];
  worksCount: number | null;
  reasons: string[];
  status: "proposed" | "accepted" | "rejected";
}

export interface ExternalRow {
  id: string;
  rowNumber: number;
  givenName: string;
  familyName: string;
  graduationYear: number | null;
  status: "pending" | "matched" | "created" | "skipped";
  personId: string | null;
  matches: StoredExternalMatch[];
}

export interface ExternalBatchDocument {
  batchId: string;
  rows: ExternalRow[];
}
