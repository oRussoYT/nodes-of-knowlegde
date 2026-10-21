import { describeInstitutionProvenance, institutionPeriod } from "../derive";
import { SCHEME_LABELS, STATUS_LABELS } from "../copy";
import type { Organization } from "../types";
import { InstitutionProvenance } from "./InstitutionProvenance";

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
  const schemes = organization.externalIdentifiers.map((identifier) => SCHEME_LABELS[identifier.scheme]);

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

      {schemes.length > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">External identifiers: {schemes.join(", ")}</p>
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
