// Centralized, honest, Node-neutral copy for the Revelation surfaces, and the
// DETERMINISTIC derivation of a revealed element's one-sentence explanation. No
// AI-generated prose (a revealed person reads only from what its participation
// Assertion supports); no social/engagement language; no metric, ranking,
// prestige, popularity, influence, similarity, recommendation, or "most
// connected" language anywhere. Unit-tested for Node-neutrality and the absence
// of that vocabulary.
//
// The co-presence lenses state plainly that they show a DOCUMENTED co-presence --
// a record that people were at the same institution in overlapping years -- and
// NOT that they knew one another, worked together, or formed a group (that would
// be inference/interpretation, which M8 refuses). They also state that the
// co-presence shown is the DOCUMENTED one, not the true one, and that absence is
// never proof no co-presence exists. Per the M8 Specification's structural-naming
// rule (Spec Sec.2 flags calling a documented cohort "a generation" as
// interpretation), the institution surface says "documented co-presence", never
// "generation".

import type {
  CoverageGap,
  CoverageSpan,
  DocumentedStatus,
  LineageStep,
  PathwayStep,
  PersonPathwayDocument,
  RecurrenceGroup,
  RevelationCapacityRef,
} from "./types";

export const revelationCopy = {
  // M8.1 -- person co-presence.
  personCohorts: {
    title: "Documented cohorts",
    whatThisShows:
      "Other people documented at the same institutions as this person, during " +
      "periods that overlap this person's. This is a documented co-presence — a " +
      "record that they were there in the same years — not a record that they " +
      "knew one another, worked together, or formed a group.",
    empty: {
      title: "No documented cohorts yet",
      description:
        "No other person is yet recorded at the same institution as this person " +
        "during an overlapping period. This is an honest absence, not a claim " +
        "that there was none — it shows only co-presence supported by dated, " +
        "explicit participation records.",
    },
    limitsHeading: "Limits of this view",
    limits:
      "This shows the documented cohort, not the true one. It is composed only " +
      "from dated, explicit participation records preserved on this platform, so " +
      "people who were present but never recorded — or recorded without dates — " +
      "do not appear. Overlapping periods mean the records place these people at " +
      "the same institution in the same years; they do not, by themselves, mean " +
      "the people met or worked together. Absence from this view is never proof " +
      "that no co-presence exists.",
    membersHeading: "Documented here at the same time",
    anchorHeading: "This person's participation here",
  },

  // M8.2 -- institution co-presence.
  organizationGenerations: {
    title: "Documented co-presence",
    whatThisShows:
      "People the record documents at this institution at the same time as one " +
      "another — each shown with the others whose documented period here overlaps " +
      "theirs. This is a documented co-presence — a record that they were here in " +
      "the same years — not a record that they knew one another, worked together, " +
      "or formed a group.",
    empty: {
      title: "No documented co-presence yet",
      description:
        "No two people are yet recorded at this institution during an overlapping " +
        "period. This is an honest absence, not a claim that there was none — it " +
        "shows only co-presence supported by dated, explicit participation records.",
    },
    limitsHeading: "Limits of this view",
    limits:
      "This shows the documented co-presence, not the true one. It is composed " +
      "only from dated, explicit participation records preserved on this platform, " +
      "so people who were present but never recorded — or recorded without dates — " +
      "do not appear. Overlapping periods mean the records place these people here " +
      "in the same years; they do not, by themselves, mean the people met or " +
      "worked together. Absence from this view is never proof that no co-presence " +
      "exists.",
    participationsHeading: "Documented here",
    coPresentHeading: "Documented here at the same time",
  },

  // M8.3 -- institutional succession/formation descent.
  organizationLineage: {
    title: "Documented institutional descent",
    whatThisShows:
      "A documented chain of succession and formation records connecting this " +
      "institution to others — those the record places before it, and those it " +
      "places after it. It records what came before what, not what caused or gave " +
      "rise to what; the meaning of a succession is left to a historian.",
    empty: {
      title: "No documented descent yet",
      description:
        "No succession or formation record yet connects this institution to " +
        "another. This is an honest absence, not a claim that it had no predecessor " +
        "or successor — it shows only descent supported by explicit, directional " +
        "institutional records.",
    },
    limitsHeading: "Limits of this view",
    limits:
      "This shows the documented descent, not the true one. It is composed only " +
      "from explicit succession and formation records preserved on this platform, " +
      "and follows them only as far as they are recorded; a gap is a silence in the " +
      "record, never proof that no link existed. It records the order the records " +
      "document — never what followed from what, which is a matter of historical " +
      "judgement.",
    subjectLabel: "The institution you are reading",
    upstreamHeading: "Documented antecedents",
    downstreamHeading: "Documented successors",
  },

  // M8.3 -- documented mentorship descent.
  personMentorshipLineage: {
    title: "Documented mentorship lineage",
    whatThisShows:
      "A documented chain of mentorship records connecting this person to others — " +
      "the mentors the record places before them, and the students it places after " +
      "them. It records who mentored whom, and nothing about what a mentorship " +
      "passed on or what it meant.",
    empty: {
      title: "No documented mentorship lineage yet",
      description:
        "No mentorship record yet connects this person to a mentor or a student. " +
        "This is an honest absence, not a claim that there was none — it shows only " +
        "mentorship supported by explicit, directional records.",
    },
    limitsHeading: "Limits of this view",
    limits:
      "This shows the documented mentorship lineage, not the true one. It is " +
      "composed only from explicit mentorship records preserved on this platform, " +
      "and follows them only as far as they are recorded; a gap is a silence in the " +
      "record, never proof that no link existed. It records who mentored whom — " +
      "never what a mentorship passed on or what it meant, which is a matter of " +
      "historical judgement.",
    subjectLabel: "The person you are reading",
    upstreamHeading: "Documented mentors",
    downstreamHeading: "Documented students",
  },

  // M8.4 -- continuity & rupture.
  organizationContinuity: {
    title: "Documented continuity and rupture",
    whatThisShows:
      "For each capacity people are documented in here, the periods the record " +
      "covers — and the silences between them. A period that runs to an open-ended " +
      "record is documented as still current; a break between periods is a gap in " +
      "the record, not a documented ending; a record that simply stops leaves what " +
      "followed undocumented. The institution's own recorded status is shown as it " +
      "stands, separately from the coverage.",
    empty: {
      title: "No documented continuity yet",
      description:
        "This institution carries no recorded terminal status and no dated " +
        "participation records to trace over time. This is an honest absence, not a " +
        "claim that nothing was sustained or that anything ended — it shows only " +
        "what dated, explicit records support.",
    },
    limitsHeading: "Limits of this view",
    limits:
      "This shows the documented coverage, not the true one. It is composed only " +
      "from dated, explicit participation records preserved on this platform, so " +
      "periods that were real but never recorded — or recorded without dates — do " +
      "not appear, and coverage is summarised by year. A gap between recorded " +
      "periods is a silence in the record; it is never, by itself, proof that the " +
      "capacity was interrupted or ended. Where the record stops, the honest reading " +
      "is that what followed is not documented — not that the activity ended. The " +
      "institution's recorded status is its own explicit assertion; it is never used " +
      "to date the end of any particular capacity.",
    statusHeading: "Recorded status of this institution",
    coverageHeading: "Documented coverage by capacity",
  },

  // M8.5 -- documented recurrence (person).
  personRecurrence: {
    title: "Documented recurrence",
    whatThisShows:
      "Phenomena the record documents more than once for this person — the same " +
      "role held again at the same institution, events of the same kind, and " +
      "contributions of the same kind. It shows how many times each is documented, " +
      "and when. A count here is a count of records, not a measure of activity or " +
      "standing, and the occurrences are listed in time order, never ranked.",
    empty: {
      title: "No documented recurrence yet",
      description:
        "Nothing is yet recorded more than once for this person. This is an honest " +
        "absence, not a claim that nothing recurred — a single documented occurrence " +
        "is not recurrence, and only explicit, repeated records appear here.",
    },
    limitsHeading: "Limits of this view",
    limits:
      "This shows the documented recurrence, not the true one. It counts only " +
      "distinct, explicit records preserved on this platform, so occurrences that " +
      "were real but never recorded do not appear, and two records of the same " +
      "occurrence would each be counted. A count is the number of documented " +
      "occurrences — never a measure of activity, standing, or weight; occurrences " +
      "are shown in time order, and where a date is unknown it is shown as unknown, " +
      "never guessed.",
  },

  // M8.5 -- documented recurrence (institution).
  organizationRecurrence: {
    title: "Documented recurrence",
    whatThisShows:
      "Phenomena the record documents more than once for this institution — events " +
      "of the same kind and contributions of the same kind. It shows how many times " +
      "each is documented, and when. A count here is a count of records, not a " +
      "measure of activity or standing, and the occurrences are listed in time " +
      "order, never ranked. Repeated roles over time are shown in the documented " +
      "continuity above.",
    empty: {
      title: "No documented recurrence yet",
      description:
        "Nothing is yet recorded more than once for this institution. This is an " +
        "honest absence, not a claim that nothing recurred — a single documented " +
        "occurrence is not recurrence, and only explicit, repeated records appear here.",
    },
    limitsHeading: "Limits of this view",
    limits:
      "This shows the documented recurrence, not the true one. It counts only " +
      "distinct, explicit records preserved on this platform, so occurrences that " +
      "were real but never recorded do not appear, and two records of the same " +
      "occurrence would each be counted. A count is the number of documented " +
      "occurrences — never a measure of activity, standing, or weight; occurrences " +
      "are shown in time order, and where a date is unknown it is shown as unknown, " +
      "never guessed.",
  },

  // M8.6 -- bounded pathway (person). Governed by the endpoint rule.
  personPathway: {
    title: "Documented pathway",
    whatThisShows:
      "A documented chain of explicit records linking this person to another entity " +
      "you choose — a person, institution, contribution, or event — through " +
      "intermediaries. It shows only the literal chain: a chain of steps is not a " +
      "connection between its ends, and a longer chain says less, not more. Each step " +
      "is one documented record; the chain composes several, and nothing more.",
    noTarget: {
      title: "Choose an entity to trace a documented chain",
      description:
        "This traces the documented chain of records that links this person to " +
        "another person, institution, contribution, or event — once you choose one " +
        "(for example, from a person revealed above). No chain is proposed; only the " +
        "recorded steps are shown, and only when a second entity is chosen.",
    },
    targetNotFound: {
      title: "That record could not be found",
      description:
        "The chosen entity is not a readable record on this platform, so no " +
        "documented chain can be traced to it.",
    },
    noChain: {
      title: "No documented chain within four steps",
      description:
        "No documented chain of two to four recorded steps links them. This is an " +
        "honest absence, not a claim that the two are unrelated — a single direct " +
        "record, if one exists, is shown as a connection on each record's own page, " +
        "not here; and steps that were real but never recorded do not appear.",
    },
    limitsHeading: "Limits of this view",
    limits:
      "This shows one documented chain, not the only one, and not a connection " +
      "between its endpoints. It is composed only from explicit records preserved on " +
      "this platform, follows them at most four steps, and stops there — where it " +
      "stops is a silence in the record, never proof the two are unrelated. A chain " +
      "of N steps is exactly N recorded links and nothing more: it does not measure " +
      "how the two entities relate, and chains are never ordered or scored by length.",
    chainHeading: "The documented chain, step by step",
    // The minimal doorway that sets the pathway target (?pathwayTo) from a person
    // already revealed on the page. Not a recommendation -- it names the chain the
    // record can trace, never asserts one exists.
    doorwayLabel: "Trace the documented chain to this person",
  },
} as const;

function lower(value: string): string {
  return value.toLowerCase();
}

function article(word: string): string {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}

/**
 * Deterministic one-sentence statement of a documented participation at the
 * institution ("here"), from the record's own capacity. Used for a cohort
 * member, an institution participant, and an anchor. Uses ONLY the capacity
 * label the participation Assertion supplies; asserts nothing beyond the
 * documented belonging (dates are carried by the separate period line, not
 * here). No inference, no relationship claim.
 */
export function describeParticipationHere(subject: string, capacity: RevelationCapacityRef): string {
  const cap = lower(capacity.label);
  return `${subject} participated here as ${article(cap)} ${cap}.`;
}

/** Human phrase for the canonical record a revealed element decomposes to, used
 * in the provenance disclosure so a reader learns which canonical engine the
 * element was projected from. Deterministic; never cites the revelation itself. */
export function revelationSourceRecordLabel(type: string): string {
  switch (type) {
    case "participations":
      return "participation record";
    case "relationships":
      return "relationship record";
    case "organization_relationships":
      return "institutional relationship record";
    case "events":
      return "event record";
    case "contributions":
      return "contribution record";
    case "person_contributions":
    case "organization_contributions":
      return "contribution attribution record";
    case "person_events":
    case "organization_events":
    case "contribution_events":
      return "event association record";
    default:
      return "documented record";
  }
}

const PATHWAY_CATEGORY_PHRASE: Record<PathwayStep["category"], string> = {
  relationship: "relationship",
  institutional_relationship: "institutional relationship",
  participation: "participation",
  contribution: "contribution",
  event: "event",
};

/**
 * The ENDPOINT-RULE summary of a found pathway (Spec §3.2). States exactly the
 * literal existence of the chain and its length as a fact — "a documented chain
 * of N steps connects A and B" — and NEVER "A is connected to B". The length is
 * reported, never ranked; the chain is never called the shortest, closest, or
 * strongest.
 */
export function describePathwaySummary(document: PersonPathwayDocument): string {
  const toLabel = document.to ? document.to.label : "the selected entity";
  return `A documented chain of ${document.stepCount} steps connects ${document.from.label} and ${toLabel}.`;
}

/**
 * Deterministic neutral reading of one pathway step's connecting assertion, for
 * the middle of "{from} — {relation} — {to}". Structural only: the category names
 * WHAT KIND of documented record links the two endpoints; the label is the
 * vocabulary term the record carries. Asserts nothing beyond the documented link.
 */
export function describePathwayStepRelation(step: PathwayStep): string {
  return `documented ${PATHWAY_CATEGORY_PHRASE[step.category]} (${lower(step.label)})`;
}

/**
 * Deterministic one-sentence reading of a lineage step, in the assertion's own
 * direction, from the kind vocabulary's source-role label ("Predecessor",
 * "Mentor", "Antecedent body", …). "{from} is a documented {role} of {to}."
 * Asserts only the documented directional relation the record carries; nothing
 * about transmission, cause, or meaning. Node-neutral (the role word is data).
 */
export function describeLineageStep(step: LineageStep): string {
  const role = lower(step.kind.sourceRole);
  return `${step.from.label} is a documented ${role} of ${step.to.label}.`;
}

/**
 * Deterministic one-sentence heading for a recurrence group, leading with the
 * plain count of documented occurrences (Spec §3.5: "documented N times"). The
 * count is stated neutrally and NEVER as importance, activity, or a rank; the
 * phrasing is structural (a role at an institution; an event/contribution of a
 * kind). The kind/capacity label is data from the controlled vocabulary.
 */
export function describeRecurrenceGroup(group: RecurrenceGroup): string {
  switch (group.category) {
    case "role":
      return `Documented ${group.count} times as ${group.label}${
        group.anchor ? ` at ${group.anchor.label}` : ""
      }.`;
    case "event":
      return `Documented ${group.count} times as an event of kind ${group.label}.`;
    case "contribution":
      return `Documented ${group.count} times as a contribution of kind ${group.label}.`;
    default:
      return `Documented ${group.count} times.`;
  }
}

/**
 * Deterministic one-sentence reading of a single coverage span in a capacity
 * (the capacity itself is the section heading, so it is not repeated here). An
 * open-ended span states the record documents the capacity as still current --
 * the ONE explicit continuation signal; a closed span states only the documented
 * extent, and asserts nothing about what came after it.
 */
export function describeCoverageSpan(span: CoverageSpan): string {
  if (span.isOpen) {
    return `Documented from ${span.startYear}, open-ended in the latest record.`;
  }
  if (span.endYear === span.startYear) {
    return `Documented in ${span.startYear}.`;
  }
  return `Documented from ${span.startYear} to ${span.endYear}.`;
}

/**
 * Deterministic reading of a silence between two documented spans. It is stated
 * as a gap in the record -- explicitly NOT a demonstrated interruption or end.
 */
export function describeCoverageGap(gap: CoverageGap): string {
  return (
    `No participation in this capacity is documented between ${gap.fromYear} and ` +
    `${gap.toYear} — a gap in the record, not a documented ending.`
  );
}

/**
 * Deterministic per-capacity outcome sentence, read from the single explicit
 * continuation signal. Open-ended latest record -> documented as still current
 * (continuation). Otherwise -> the record does not document what followed
 * (unknown outcome) -- NEVER "the capacity ended", which the record does not say.
 */
export function describeContinuityOutcome(latestIsOpen: boolean): string {
  return latestIsOpen
    ? "The latest documented participation is open-ended, so the record documents " +
        "this capacity as still current here."
    : "After the latest documented period, the record does not document what " +
        "followed.";
}

/**
 * Deterministic reading of the institution's OWN recorded status, from the
 * explicit organizations.status vocabulary. Only the terminal keys (closed,
 * absorbed, succeeded, merged) state a documented rupture, with the closure year
 * when one is recorded. Provisional / unknown states say plainly that the record
 * does not determine the current status. Never inferred from the coverage.
 */
export function describeDocumentedStatus(
  status: DocumentedStatus,
  closureYear: number | null,
): string {
  const since = closureYear === null ? "." : ` in ${closureYear}.`;
  switch (status.key) {
    case "active":
      return "The record documents this institution as active.";
    case "historical":
      return "The record documents this institution as historical.";
    case "dormant":
      return "The record documents this institution as dormant.";
    case "closed":
      return `The record documents this institution as closed${since}`;
    case "merged":
      return `The record documents this institution as merged into another${since}`;
    case "absorbed":
      return `The record documents this institution as absorbed into another${since}`;
    case "succeeded":
      return `The record documents this institution as succeeded by another${since}`;
    case "provisional":
      return "The record does not yet determine this institution's current status.";
    default:
      return "The record does not determine this institution's current status.";
  }
}
