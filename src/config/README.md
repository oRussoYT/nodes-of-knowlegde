# src/config

Application-level configuration and constants (e.g. site metadata, future
locale/i18n configuration, navigation structure). Controlled vocabularies
that back domain data (roles, institution types, relationship types, etc.)
belong in the database, not here — see docs/controlled-vocabularies.md.

## Modules

- `site.ts` — the single source of truth for this deployment's public
  identity: the product name (`SITE_NAME`), tagline (`SITE_DESCRIPTION`),
  and the `pageTitle()` helper that derives each route's `<title>` from
  them. This is the deployment/"skin" layer described in
  `docs/decisions/0007-netpdbff-first-vertical-general-research-infrastructure.md`
  and named in `docs/decisions/0010-platform-vision-nodes-of-knowledge.md`:
  the running application is the platform's first Node ("Node PDBFF"), and
  its brand lives here as configuration rather than as literals scattered
  through component code. Prose copy that mentions the product by name is
  *not* here — that is translatable content and stays in page/feature copy.
