// The plans an institution can ask for (docs/PRODUTO.md, decision of
// 28 Oct 2026). Prices are agreed in conversation for now; nothing is
// charged on the site until a payment account exists.

export type PlanKey = "pro_bono" | "university" | "institution";
export type InstitutionKind = "conservation_research" | "university" | "research_centre" | "museum" | "other";

export interface Plan {
  key: PlanKey;
  name: string;
  forWhom: string;
  price: string;
  includes: string[];
}

export const PLANS: Plan[] = [
  {
    key: "pro_bono",
    name: "Conservation research",
    forWhom: "Research institutions working on biodiversity conservation, like the BDFFP.",
    price: "Free (pro bono)",
    includes: [
      "Your own Node with page, identity and stewards",
      "People, institutions, projects and stations over time",
      "Cohorts, lineages and what the record reveals",
      "Claims, proposals with documents and one review queue",
      "ORCID, Lattes and OpenAlex imports",
    ],
  },
  {
    key: "university",
    name: "University",
    forWhom: "Universities and their graduate programmes.",
    price: "Annual subscription — price on request",
    includes: [
      "Everything in the conservation plan",
      "Graduate outcomes by level: undergraduate, master's, doctorate",
      "CAPES “destino de egressos” export",
      "Institution indicators for rankings, with the method stated",
      "Steward console for each programme",
    ],
  },
  {
    key: "institution",
    name: "Research centre or museum",
    forWhom: "Research centres, museums, herbaria, collections and foundations.",
    price: "Annual subscription — price on request",
    includes: [
      "Everything in the conservation plan",
      "Collections, expeditions and archives with their history",
      "Where your alumni and visiting researchers went",
      "Reports for funders and boards",
    ],
  },
];

export const INSTITUTION_KINDS: { key: InstitutionKind; label: string }[] = [
  { key: "conservation_research", label: "Conservation research institution" },
  { key: "university", label: "University or graduate programme" },
  { key: "research_centre", label: "Research centre" },
  { key: "museum", label: "Museum, herbarium or collection" },
  { key: "other", label: "Other" },
];
