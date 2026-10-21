// Copy for the reading experience: the Explore hub and the three
// directories. Engine-neutral (Node Independence): describes reading
// surfaces, never a single vertical's subject matter. Empty states are
// honest — they say a directory has nothing yet, never invent activity.

export const directoryCopy = {
  explore: {
    title: "Explore",
    description:
      "Read the record of scientific lives, the institutions they worked through, and the contributions they made. Follow a person into their timeline, participation, and relationships; follow an institution through its history; follow a contribution to everyone credited with it.",
  },
  people: {
    title: "People",
    description:
      "Scientific lives, each with a biography, a timeline, institutional participation, and relationships. Records show their own provenance and verification honestly.",
    empty: {
      title: "No people yet",
      description: "No person records have been added yet.",
    },
  },
  institutions: {
    title: "Institutions",
    description:
      "Institutions through time — active and historical — with their identity, name history, timelines, and the people who participated in them.",
    empty: {
      title: "No institutions yet",
      description: "No institution records have been added yet.",
    },
  },
  contributions: {
    title: "Contributions",
    description:
      "Contributions as first-class historical objects, each credited to the people and institutions responsible, in their own capacities.",
    empty: {
      title: "No contributions yet",
      description: "No contribution records have been added yet.",
    },
  },
} as const;
