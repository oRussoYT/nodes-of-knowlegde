// Centralized, honest, Node-neutral copy for the Relationship surfaces. No
// PDBFF-specific language (unit-tested), no social/engagement language (no
// "people you may know", "grow your network", suggestions, or popularity). A
// person with no recorded relationships gets a dignified honest state, never
// fabricated or inferred connections.

export const relationshipsCopy = {
  sectionTitle: "Relationships",
  empty: {
    title: "No relationships yet",
    description:
      "No relationships have been recorded for this scientific life yet.",
  },
} as const;
