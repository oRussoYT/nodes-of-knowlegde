// Defensive parser for the M8.6 bounded-pathway document: untyped revelation
// jsonb -> typed reading projection, or null on an unrecognizable shape. Same
// fail-closed discipline as the other revelation parsers, with one pathway-
// specific rule: a chain must be COMPLETE and CONTIGUOUS to be shown. Unlike a
// list (where a dropped element still leaves an honest remainder), a chain with a
// missing or non-contiguous link is not decomposable end to end, so if any step
// is malformed, if the count disagrees, if the chain is shorter than two steps,
// or if the links do not join focal -> ... -> target, the document degrades to
// `found: false` with no steps -- a broken chain is never shown as a pathway.

import {
  isRecord,
  asString,
  asNonBlankString,
  parseAnyNode,
  parseProvenance,
  parseSourceRef,
  parseTemporal,
} from "./parse-shared";
import type {
  PathwayStep,
  PathwayStepCategory,
  PersonPathwayDocument,
} from "./types";

const CATEGORIES: readonly PathwayStepCategory[] = [
  "relationship",
  "institutional_relationship",
  "participation",
  "contribution",
  "event",
];

function parseStep(input: unknown): PathwayStep | null {
  if (!isRecord(input)) return null;

  const source = parseSourceRef(input.source);
  if (source === null) return null;

  const category =
    typeof input.category === "string" && (CATEGORIES as readonly string[]).includes(input.category)
      ? (input.category as PathwayStepCategory)
      : null;
  if (category === null) return null;

  const label = asNonBlankString(input.label);
  if (label === null) return null;

  const from = parseAnyNode(input.from);
  const to = parseAnyNode(input.to);
  if (from === null || to === null) return null;

  const temporal = parseTemporal(input.temporal);
  if (temporal === null) return null;

  const provenance = parseProvenance(input.provenance);
  if (provenance === null) return null;

  return { source, category, label, from, to, temporal, provenance };
}

/** True only when the steps form a contiguous chain focal -> ... -> target: each
 * step's `to` is the next step's `from`, the first `from` is the focal id, and
 * the last `to` is the target id. This is the pathway's decomposability
 * guarantee -- a reader can walk the chain end to end without a break. */
function isContiguousChain(steps: PathwayStep[], fromId: string, toId: string): boolean {
  const first = steps[0];
  const last = steps[steps.length - 1];
  if (steps.length < 2 || first === undefined || last === undefined) return false;
  if (first.from.id !== fromId) return false;
  if (last.to.id !== toId) return false;
  for (let i = 1; i < steps.length; i += 1) {
    const cur = steps[i];
    const prev = steps[i - 1];
    if (cur === undefined || prev === undefined || cur.from.id !== prev.to.id) return false;
  }
  return true;
}

export function parsePersonPathwayDocument(input: unknown): PersonPathwayDocument | null {
  if (!isRecord(input)) return null;

  const fromId = asString(input.from_id);
  if (fromId === null) return null;

  const from = parseAnyNode(input.from);
  if (from === null || from.type !== "person") return null;

  const toId = asString(input.to_id);
  if (toId === null) return null;

  const to = input.to === null || input.to === undefined ? null : parseAnyNode(input.to);
  const targetResolved = input.target_resolved === true;

  // The honest "no chain" document: an unresolved target, or resolved with no
  // pathway. Either way, no steps are shown.
  const emptyDoc: PersonPathwayDocument = {
    fromId,
    from,
    toId,
    to,
    targetResolved,
    found: false,
    stepCount: 0,
    steps: [],
  };

  if (input.found !== true) return emptyDoc;

  if (!Array.isArray(input.steps)) return emptyDoc;
  const steps: PathwayStep[] = [];
  for (const item of input.steps) {
    const step = parseStep(item);
    if (step === null) return emptyDoc; // a broken link -> no chain (fail closed)
    steps.push(step);
  }

  const declaredCount =
    typeof input.step_count === "number" && Number.isInteger(input.step_count)
      ? input.step_count
      : null;

  // A shown chain must be complete (count agrees), >= 2 steps, and contiguous
  // focal -> target. Otherwise it is not a decomposable pathway.
  if (declaredCount !== steps.length) return emptyDoc;
  if (!isContiguousChain(steps, fromId, toId)) return emptyDoc;

  return {
    fromId,
    from,
    toId,
    to,
    targetResolved: true,
    found: true,
    stepCount: steps.length,
    steps,
  };
}
