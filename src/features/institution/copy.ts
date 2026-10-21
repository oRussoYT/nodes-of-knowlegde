// Centralized, honest, Node-neutral copy for the Institution surfaces. No
// PDBFF-specific language (unit-tested), no corporate/marketing language, no
// engagement or "complete this profile" prompts, no statistics as a substitute
// for history. Absence is information: an institution with little recorded
// history stays dignified. Works unchanged for a university, a museum, an
// archive, a field station, an Indigenous organization, or a community
// association.

import type { ExternalIdentifierScheme, NarrativeKind, OrganizationNameType, OrganizationStatus } from "./types";

export const STATUS_LABELS: Record<OrganizationStatus, string> = {
  active: "Active",
  historical: "Historical",
  closed: "Closed",
  dormant: "Dormant",
  merged: "Merged",
  absorbed: "Absorbed",
  succeeded: "Succeeded",
  provisional: "Provisional record",
  status_unknown: "Status unknown",
};

export const NAME_TYPE_LABELS: Record<OrganizationNameType, string> = {
  former: "Former name",
  alternative: "Also known as",
  acronym: "Acronym",
  indigenous: "Indigenous name",
  local: "Local name",
  translation: "Translation",
};

export const SCHEME_LABELS: Record<ExternalIdentifierScheme, string> = {
  ror: "ROR",
  wikidata: "Wikidata",
  isni: "ISNI",
  viaf: "VIAF",
  grid: "GRID",
  national_registry: "National registry",
  archival_authority: "Archival authority",
  other: "Identifier",
};

export const NARRATIVE_FACET_LABELS: Record<NarrativeKind, string> = {
  introduction: "Introduction",
  overview: "Historical overview",
  significance: "Significance",
  legacy: "Legacy",
};

export const institutionCopy = {
  notFound: {
    title: "Institution not available",
    description: "This record is not available. It may not exist.",
  },
  introduction: {
    heading: "Introduction",
    absent: {
      title: "No institutional history yet",
      description: "The history of this institution has not yet been recorded.",
    },
  },
  nameHistory: {
    heading: "Names",
  },
  identifiers: {
    heading: "External identifiers",
    absent: "No external identifiers are recorded.",
  },
  participation: {
    heading: "People and participation",
    empty: {
      title: "No participation recorded yet",
      description: "The people who sustained this institution have not yet been recorded.",
    },
  },
  records: {
    heading: "Historical records",
    reserved: {
      title: "Historical records are not yet described",
      description:
        "Photographs, maps, correspondence, field notebooks, oral histories, reports, and collections will appear here as they are described, with their own custody and provenance.",
    },
  },
  legacy: {
    heading: "Legacy",
    absent: {
      title: "Legacy has not yet been recorded",
      description: "The institution's continuing influence has not yet been recorded.",
    },
  },
  withheldNote:
    "This account is assembled from provenance-bearing assertions. Absence, uncertainty, and disagreement are shown honestly, not hidden.",
} as const;
