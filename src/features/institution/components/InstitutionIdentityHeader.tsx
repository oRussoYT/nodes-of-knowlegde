import { describeInstitutionProvenance, institutionPeriod } from "../derive";
import { SCHEME_LABELS, STATUS_LABELS } from "../copy";
import type { Organization } from "../types";
import { InstitutionProvenance } from "./InstitutionProvenance";
import { identifierUrls } from "@/features/public-api/envelope";

// The institution identity header: the canonical name (one clear h1), its short
// form, type, historical STATUS (distinct from verification), operating period,
// and place -- with external-identifier availability and the record's own
// provenance one gesture away. Dignified without imagery; no logo required, no
// reduction to a logo. Server Component.
export function InstitutionIdentityHeader({ organization }: { organization: Organization }) {
  const period = institutionPeriod(organization);
  const provenance = describeInstitutionProvenance(
    organization.provenance.sourceType,
    organization.provenance.verificationStatus,
  );
  const meta = [organization.type?.label, STATUS_LABELS[organization.status], period, organization.location].filter(
    (part): part is string => Boolean(part),
  );
  // ROR and Wikidata ids open their public pages; others are named only.
  const identifiers = organization.externalIdentifiers.map((identifier) => {
    const links = identifierUrls({ [identifier.scheme]: identifier.identifierValue });
    const href = identifier.url ?? (identifier.scheme === "ror" ? links.ror : identifier.scheme === "wikidata" ? links.wikidata : null);
    return { id: identifier.id, label: SCHEME_LABELS[identifier.scheme], href };
  });

  return (
    <header>
      <h1 className="text-2xl font-semibold text-foreground">
        {organization.name}
        {organization.shortName ? (
          <span className="ml-2 text-lg font-normal text-muted-foreground">({organization.shortName})</span>
        ) : null}
      </h1>

      {meta.length > 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{meta.join(" · ")}</p>
      ) : null}

      {organization.website ? (
        <p className="mt-1 text-sm">
          <a
            href={organization.website}
            className="text-accent underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            rel="noreferrer noopener"
            target="_blank"
          >
            Website
          </a>
        </p>
      ) : null}

      {identifiers.length > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          External identifiers:{" "}
          {identifiers.map((i, n) => (
            <span key={i.id}>
              {n > 0 ? ", " : ""}
              {i.href ? (
                <a href={i.href} className="underline underline-offset-2" rel="noreferrer noopener" target="_blank">
                  {i.label}
                </a>
              ) : (
                i.label
              )}
            </span>
          ))}
        </p>
      ) : null}

      <div className="mt-3">
        <InstitutionProvenance
          subject="this institution record"
          sourceLabel={provenance.sourceLabel}
          statusLabel={provenance.statusLabel}
        />
      </div>
    </header>
  );
}
