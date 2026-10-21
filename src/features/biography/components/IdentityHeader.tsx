import { Avatar } from "@/components/ui/Avatar";
import { SITE_NAME } from "@/config/site";

import { describeProvenance, primaryName } from "../derive";
import type { BiographyDocument } from "../types";
import { ClaimStateBadge } from "./ClaimStateBadge";
import { ProvenanceDisclosure } from "./ProvenanceDisclosure";

// The permanent person identity header. Shows only what is known and
// authorized: name, a dignified initials fallback where there is no portrait
// (the honest default -- most historical records never had a photo taken),
// claim/verification state, an "in memoriam" marker for deceased subjects
// (without the full Legacy Engine and without exact dates), and the identity
// provenance one gesture away. No scholarly/institutional descriptor is shown
// because M6.1 holds no such data -- it is never fabricated. Node context
// comes from configuration (SITE_NAME), never a hardcoded institution.
// Server Component.
export function IdentityHeader({ document }: { document: BiographyDocument }) {
  const name = primaryName(document);
  const { preferredName, isDeceased } = document.identity;
  const provenance = describeProvenance(document.provenance.sourceType, document.provenance.verificationStatus);

  return (
    <header>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {SITE_NAME} · Scientific biography
      </p>

      <div className="mt-4 flex items-center gap-4">
        <Avatar name={name} size="lg" />
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-foreground break-words">{name}</h1>
          {preferredName && preferredName !== name ? (
            <p className="mt-1 text-sm text-muted-foreground">Known as {preferredName}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ClaimStateBadge document={document} />
        {isDeceased ? <span className="text-sm text-muted-foreground">In memoriam</span> : null}
        <ProvenanceDisclosure
          subject="identity"
          sourceLabel={provenance.sourceLabel}
          statusLabel={provenance.statusLabel}
        />
      </div>
    </header>
  );
}
