// Graduate-list import (supabase/migrations/20261017110000_add_graduate_import.sql).

export type MatchReason = "same_name" | "same_family_initial";

export interface ImportCandidate {
  personId: string;
  displayName: string;
  reason: MatchReason;
  documentedAtInstitution: boolean;
  isDemo: boolean;
}

export interface PendingImportRow {
  id: string;
  rowNumber: number;
  givenName: string;
  familyName: string;
  degree: string | null;
  programme: string | null;
  graduationYear: number | null;
  externalRef: string | null;
  candidates: ImportCandidate[];
}

export interface ImportCandidatesDocument {
  batchId: string;
  organizationId: string | null;
  rows: PendingImportRow[];
}

export interface ImportBatchSummary {
  id: string;
  label: string;
  organizationId: string | null;
  organizationName: string | null;
  createdAt: string;
  total: number;
  pending: number;
  matched: number;
  created: number;
  skipped: number;
}
