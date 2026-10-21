// Centralized, honest, Node-neutral copy for the Timeline surfaces. No
// PDBFF-specific language (unit-tested), no engagement / "complete your
// timeline" copy, no fabricated milestones.

export const timelineCopy = {
  sectionTitle: "Timeline",
  empty: {
    title: "No timeline yet",
    description: "No timeline events have been recorded for this scientific life yet.",
  },
  undatedGroupLabel: "Date unknown",
} as const;
