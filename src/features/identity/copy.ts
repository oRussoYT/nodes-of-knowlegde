// Pure state-to-copy mapping for IdentityStatus — see
// tests/unit/identity-copy.test.ts. Never includes decision_notes or any
// reviewer/administrative field: per the milestone's explicit requirement,
// the claimant sees what their status means, not why a reviewer decided
// it. No fabricated data (participation, network, publications) appears
// in any of this copy.
//
// Production Experience Phase I: the no_claim copy states the truth of the
// product TODAY — claiming a person record is a real, available workflow
// (M5.3), reached by the "Claim a person record" action on /member. Earlier
// wording that described claiming, participation, and the network as a "later
// milestone" was obsolete once those engines shipped (M5.3–M7) and is removed.

import type { IdentityStatus } from "./types";

export interface IdentityStatusCopy {
  title: string;
  description: string;
}

export function getIdentityStatusCopy(status: IdentityStatus): IdentityStatusCopy {
  switch (status.kind) {
    case "no_claim":
      return {
        title: "Not yet connected to a Nodes BDFFP person record",
        description:
          "You can search the record for an existing person that represents you and submit a claim to link it to your account. Claims are reviewed before a person record is linked.",
      };
    case "pending":
      return {
        title: status.personDisplayName
          ? `Your claim on ${status.personDisplayName} is being reviewed`
          : "Your claim is being reviewed",
        description:
          "Submitted claims are reviewed before a person record is linked to your account. This can take some time — there is nothing further to do while it's pending.",
      };
    case "approved":
      return {
        title: status.personDisplayName
          ? `Your account is linked to ${status.personDisplayName}`
          : "Your account is linked to a person record",
        description:
          "Your claim was approved and your account is now linked to this person record. You can read its canonical page in the record.",
      };
    case "rejected":
      return {
        title: status.personDisplayName
          ? `Your claim on ${status.personDisplayName} was not approved`
          : "Your claim was not approved",
        description: "You can search for and submit a claim on a different person record if this one wasn't a match.",
      };
    case "withdrawn":
      return {
        title: status.personDisplayName
          ? `You withdrew your claim on ${status.personDisplayName}`
          : "You withdrew your claim",
        description: "You can submit a new claim at any time.",
      };
  }
}
