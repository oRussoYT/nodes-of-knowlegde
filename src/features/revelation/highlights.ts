// What the record reveals about one person, gathered into a few large facts
// at the top of their page (ROTEIRO fase 2, etapa C: revelations visible).
// Pure -- derived only from the revelation documents already read for the
// page; each fact is a count of DOCUMENTED things and links to the section
// that decomposes it to its records. Never a score, never compared to anyone.

import type { PersonCohortsDocument, PersonMentorshipLineageDocument, PersonRecurrenceDocument } from "./types";

export type HighlightKey = "alongside" | "mentors" | "descendants" | "generations" | "recurrence";

export interface RevelationHighlight {
  key: HighlightKey;
  value: number;
  label: string;
  href: string;
}

export function buildRevelationHighlights(
  focalPersonId: string,
  cohorts: PersonCohortsDocument | null,
  lineage: PersonMentorshipLineageDocument | null,
  recurrence: PersonRecurrenceDocument | null,
): RevelationHighlight[] {
  const alongside = new Set<string>();
  for (const cohort of cohorts?.cohorts ?? []) {
    for (const member of cohort.members) {
      if (member.person.id !== focalPersonId) alongside.add(member.person.id);
    }
  }

  const mentors = new Set<string>();
  for (const step of lineage?.upstream ?? []) {
    if (step.depth === 1) {
      const other = step.from.id === focalPersonId ? step.to.id : step.from.id;
      if (other !== focalPersonId) mentors.add(other);
    }
  }

  const descendants = new Set<string>();
  let generations = 0;
  for (const step of lineage?.downstream ?? []) {
    for (const id of [step.from.id, step.to.id]) {
      if (id !== focalPersonId) descendants.add(id);
    }
    generations = Math.max(generations, step.depth);
  }

  const recurring = recurrence?.groups.length ?? 0;

  const items: RevelationHighlight[] = [
    {
      key: "alongside",
      value: alongside.size,
      label: alongside.size === 1 ? "person documented in the same place at the same time" : "people documented in the same place at the same time",
      href: "#cohorts-heading",
    },
    {
      key: "mentors",
      value: mentors.size,
      label: mentors.size === 1 ? "documented mentor" : "documented mentors",
      href: "#mentorship-lineage-heading",
    },
    {
      key: "descendants",
      value: descendants.size,
      label: descendants.size === 1 ? "academic descendant" : "academic descendants",
      href: "#mentorship-lineage-heading",
    },
    {
      key: "generations",
      value: generations,
      label: generations === 1 ? "generation of students" : "generations of students",
      href: "#mentorship-lineage-heading",
    },
    {
      key: "recurrence",
      value: recurring,
      label: recurring === 1 ? "pattern that recurs in the record" : "patterns that recur in the record",
      href: "#person-recurrence-heading",
    },
  ];
  return items.filter((item) => item.value > 0);
}

/** One sentence for the claim moment: "Your record documents …". Null when nothing is revealed. */
export function claimRevelationSentence(highlights: RevelationHighlight[]): string | null {
  const pick = (key: HighlightKey) => highlights.find((h) => h.key === key);
  const parts: string[] = [];
  const descendants = pick("descendants");
  const alongside = pick("alongside");
  const mentors = pick("mentors");
  if (descendants) parts.push(`${descendants.value} ${descendants.value === 1 ? "academic descendant" : "academic descendants"}`);
  if (alongside) parts.push(`${alongside.value} ${alongside.value === 1 ? "person" : "people"} documented alongside you`);
  if (mentors) parts.push(`${mentors.value} ${mentors.value === 1 ? "mentor" : "mentors"}`);
  if (parts.length === 0) return null;
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `Your record documents ${list}.`;
}
