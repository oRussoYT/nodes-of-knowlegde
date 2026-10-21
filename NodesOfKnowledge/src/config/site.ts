// Single source of truth for this deployment's public identity (product
// name, tagline, and the page-title pattern derived from them).
//
// Platform vs. deployment (see docs/decisions/0010-platform-vision-nodes-of-knowledge.md
// and docs/master-vision.md): the broader platform is "Nodes of Knowledge";
// this running application is its first Node — "Nodes BDFFP" — delivered to
// the public under the product name below. Centralizing that product name
// here keeps it a *deployment-configured value*, not a literal re-typed
// across the app, so a future Node presents its own identity by changing
// configuration in one place rather than editing component code. This
// changes no behavior beyond the name itself: every surface reads SITE_NAME
// from here.
//
// Scope boundary (deliberate): this module holds brand *identifiers* — the
// name shown in the wordmark and in <title> — not prose copy that happens to
// mention the product by name (e.g. "Sign in to your Nodes BDFFP account.").
// Such copy is translatable content (see the i18n-readiness note in
// docs/architecture.md) and stays in its page/feature copy, where a future
// translation layer will own it — not spliced together from a code constant.

/** The deployment's public product name — the first Node's brand. */
export const SITE_NAME = "Nodes BDFFP";

/** The deployment's one-line tagline, used in root metadata and the landing hero. */
export const SITE_DESCRIPTION =
  "The living human network of the Biological Dynamics of Forest Fragments Project";

/**
 * A page's <title>, as "<section> — <SITE_NAME>". The single place the
 * section/name separator convention lives, so every route's title stays
 * consistent and the product name is never re-typed per page.
 */
export function pageTitle(section: string): string {
  return `${section} — ${SITE_NAME}`;
}
