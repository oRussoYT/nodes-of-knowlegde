// Types for the reading directories (/people, /institutions,
// /contributions). Each entry is the compact row the corresponding
// list_* read model returns (supabase/migrations/20260809090000_*.sql) —
// identity plus the few honest fields a listing shows. Detail lives in the
// existing per-record read models the detail pages already use.

export interface PersonIndexEntry {
  id: string;
  displayName: string;
  verificationStatus: string;
  isDeceased: boolean;
}

export interface InstitutionIndexEntry {
  id: string;
  name: string;
  shortName: string | null;
  typeLabel: string | null;
  status: string;
  verificationStatus: string;
}

export interface ContributionIndexEntry {
  id: string;
  title: string;
  kindLabel: string | null;
  verificationStatus: string;
}
