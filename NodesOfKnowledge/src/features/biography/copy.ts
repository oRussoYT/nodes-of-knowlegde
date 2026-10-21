// Centralized, honest copy for the Scientific Biography surfaces. Kept as
// data (unit-tested in tests/unit/biography-copy.test.ts) and Node-neutral
// (no PDBFF-specific language -- see docs/decisions/0007-... and the Node
// Independence test): a museum, a field station, or a university could
// present these strings unchanged.

export const biographyCopy = {
  narrativeAbsent: {
    title: "No biographical narrative yet",
    description:
      "A written account of this scientific life has not been recorded yet. What is known is shown below from the structured record.",
  },
  withheldNote:
    "Some personal details, including exact life dates, are not shown here.",
  provisionalNote:
    "This is a provisional record. It has not been claimed or verified by the person it describes.",
  notFound: {
    title: "Biography not available",
    description:
      "This record is not available. It may not exist, or it may have been merged into another record.",
  },
  // Reserved sections for later capabilities. Honest "not yet recorded"
  // states -- never fabricated data or decorative modules. Scientific
  // contributions became a live projection in M6.6 (see
  // src/features/contribution) and is no longer reserved here.
  reservedSections: {
    records: {
      title: "Historical records",
      description: "Photographs, documents, and other historical records will appear here as they are added.",
    },
    legacy: {
      title: "Legacy",
      description: "What this scientific life left behind will appear here as it is documented.",
    },
  },
  provenanceUnavailable: "Source information is not available.",
} as const;

export type ReservedSectionKey = keyof typeof biographyCopy.reservedSections;

export const RESERVED_SECTION_ORDER: readonly ReservedSectionKey[] = [
  "records",
  "legacy",
];
