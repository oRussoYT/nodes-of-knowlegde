"use client";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

// Internal-only: exercises the real, production ThemeToggle (M5.2,
// src/components/theme/ThemeToggle.tsx — extracted from what used to be
// this file's own standalone implementation in M5.1) inside the dev
// verification route, rather than maintaining a second copy of the same
// lazy-init + apply-theme logic here.
export function ThemeToggleDemo() {
  return (
    <label className="flex items-center gap-3 text-sm text-foreground">
      <ThemeToggle />
      Dark mode
    </label>
  );
}
