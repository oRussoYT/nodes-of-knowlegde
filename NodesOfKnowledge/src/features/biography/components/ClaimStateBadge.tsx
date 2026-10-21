import { Badge } from "@/components/ui/Badge";

import { deriveClaimState } from "../derive";
import type { BiographyDocument } from "../types";

// Renders the person's claim/verification state honestly -- the one settled
// state reads as verified; provisional is neutral (not alarming); disputed is
// a warning, never an error color. Never implies verification the record
// lacks. Server Component.
export function ClaimStateBadge({ document }: { document: BiographyDocument }) {
  const state = deriveClaimState(document);
  return (
    <Badge tone={state.tone} size="md">
      {state.label}
    </Badge>
  );
}
