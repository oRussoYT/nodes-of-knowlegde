// Copy for the trajectory surfaces (PRODUTO.md screens 01 and 10). Engine-
// neutral: describes the record, never a single institution's subject matter.
// Counts are facts from the record, never scores.

export const trajectoryCopy = {
  pageTitle: "Trajectory",
  heading: "Trajectory in time",
  description:
    "Every documented belonging, drawn as lanes through time — one lane per institution, one bar per documented period. Open any year to see who the record places alongside this person.",
  lanesLabel: "Institutions through time",
  ongoing: "to present",
  approximate: "approximate",
  uncertain: "not yet confirmed",
  undatedTitle: "Not drawn: no usable date",
  undatedDescription: "These periods are documented but undated, so they are listed rather than placed at a guessed point in time.",
  empty: {
    title: "No documented trajectory yet",
    description: "No dated participation has been documented for this person yet.",
  },
  year: {
    heading: "Stop at a year",
    description: "Choose a year to see who the record documents at the same institution at the same time.",
    label: "Year",
    nobody: "The record documents no one alongside this person in this year.",
    countSuffix: (n: number) => (n === 1 ? "1 person documented alongside" : `${n} people documented alongside`),
  },
  overview: {
    institutions: "institutions",
    alongside: "people documented alongside",
    mentoredBy: "documented mentors",
    mentored: "documented mentees",
    span: "years on record",
    openTrajectory: "Open the trajectory",
    note: "Facts from the record, not a score. Nothing here is ranked.",
  },
  backToBiography: "Back to the biography",
} as const;
