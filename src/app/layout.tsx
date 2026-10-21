import type { Metadata } from "next";
import "./globals.css";

import { ThemeScript } from "@/components/theme/ThemeScript";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";

// The interface language is English at launch. The `lang` attribute is set
// statically here for now; when Portuguese support is introduced this will
// become dynamic (e.g. driven by a locale segment/middleware), per
// docs/architecture.md.
const LOCALE = "en";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is scoped to this exact element only — it
    // does not suppress warnings for any descendant. It's required here
    // because ThemeScript's inline script (rendered below, inside <body>)
    // intentionally sets `data-theme` on this <html> element before React
    // hydrates, per docs/decisions/0002-...md's anti-FOUC mechanism: the
    // server-rendered markup never has `data-theme` (no cookie/session read
    // happens server-side, by design, so public routes stay static), but by
    // the time React hydrates, the browser has already run the script and
    // added the attribute. React's hydration diffing sees that as a
    // mismatch and warns — correctly, since the DOM genuinely doesn't match
    // what RootLayout's JSX alone would produce, but *incorrectly* as a bug
    // report, since this is the intended, documented mechanism, not a
    // rendering defect. This is the standard, narrowly-scoped fix for
    // exactly this situation (the same pattern `next-themes` itself uses
    // internally) — see React's own docs on `suppressHydrationWarning` for
    // "an element's attribute or text content will (necessarily) differ
    // between the server and the client, and you can't fix it."
    <html lang={LOCALE} suppressHydrationWarning>
      <body className="antialiased">
        {/* Must render before any themed content — see ThemeScript.tsx. */}
        <ThemeScript />
        {/* No header here (M5.2): the true root layout is shared by every
            route, including protected ones — rendering PublicHeader
            unconditionally here was the pre-M5.2 bug where authenticated
            pages showed PublicHeader's Log in/Register links stacked above
            ProtectedNav. Header choice now belongs to the routing layer,
            per ADR-0006 — see src/app/(public)/layout.tsx and
            src/app/(protected)/layout.tsx. */}
        {children}
      </body>
    </html>
  );
}
