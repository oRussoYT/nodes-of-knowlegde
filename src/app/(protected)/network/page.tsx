import { redirect } from "next/navigation";

// M7 refinement (ADR-0017): the Knowledge Network is internal historical
// infrastructure, not a destination. There is no standalone Network product
// homepage — documented connections are read inline on the canonical pages.
// This former landing route redirects into the reading experience so an old
// link or a typed URL lands a reader back in the museum, never on a parallel
// product surface.
export default function NetworkIndexPage() {
  redirect("/explore");
}
