import Link from "next/link";

import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { NavLink } from "@/components/layout/NavLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SITE_NAME } from "@/config/site";
import { getNavItemsByGroup } from "@/lib/navigation/select";

// Fully static — no cookies()/Supabase call of any kind. This is what keeps
// public routes (rendered under src/app/(public)/layout.tsx) from being
// forced into dynamic rendering just to render a header, per ADR-0006. See
// docs/authentication-implementation.md, "Cache behavior for authenticated
// pages" — this replaced an earlier version that read the session on every
// request specifically because of that cost.
//
// Links are read from navigationConfig (src/lib/navigation) via NavLink,
// not hand-written here — the same source MobileNavigation reads for the
// collapsed (`md`-and-below) presentation, per the M5.2 navigation
// requirement that both render from a single typed definition.
//
// The Log in/Register links are shown unconditionally, even to an already
// authenticated visitor — that's safe, not stale: src/middleware.ts redirects an
// authenticated visitor away from /login and /register the instant they're
// clicked, straight to /member. Authenticated-only navigation (Member,
// Account, the signed-in email, Log out) lives separately in
// src/components/layout/ProtectedHeader.tsx, rendered only inside
// src/app/(protected)/layout.tsx, which is already dynamic by necessity.
export function PublicHeader() {
  const items = getNavItemsByGroup("public-primary");

  return (
    // Always ink (data-theme="dark" scopes the dark tokens to this bar, so
    // the theme toggle and menu button stay visible in either theme).
    <header data-theme="dark" className="border-b border-nk-ink-3 bg-nk-ink text-nk-bone">
      <div className="flex items-center justify-between gap-3 px-6 py-4 sm:px-10">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight text-nk-bone [font-stretch:118%]">
          {SITE_NAME}
        </Link>

        <div className="flex items-center gap-4">
          <nav aria-label="Primary" className="hidden items-center gap-6 text-sm md:flex">
            {items.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                className={
                  item.id === "register"
                    ? "rounded-full bg-nk-lime px-4 py-2 font-medium text-nk-ink transition hover:bg-nk-bone"
                    : "text-[#c3c8b6] transition-colors hover:text-nk-bone"
                }
              />
            ))}
          </nav>

          <ThemeToggle />
          <MobileNavigation audience="public" />
        </div>
      </div>
    </header>
  );
}
