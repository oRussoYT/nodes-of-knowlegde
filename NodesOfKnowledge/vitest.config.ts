import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Root cause of the "Failed to resolve import '@/...'" failure: Next.js and
// TypeScript both resolve the `@/*` alias from tsconfig.json's
// `compilerOptions.paths` (`{"@/*": ["./src/*"]}`) — Next's own webpack/SWC
// build reads that file directly, and `tsc` is, definitionally, the same
// tool that owns that config. Vitest does not run through either of those;
// it runs on Vite, and Vite has its own, entirely separate module
// resolution (`resolve.alias`) that does not read tsconfig.json at all
// unless something explicitly bridges the two (e.g. the `vite-tsconfig-paths`
// plugin). No such bridge existed here, so every `@/...` import inside a
// component under test failed to resolve the moment Vitest actually tried
// to load the module graph — this is why it broke only now: the first four
// component test files (M5.1's Radix-primitives pass) were the first tests
// to import anything from `src/components/ui`, which is where every `@/...`
// import lives; the pre-existing pure-function tests never imported
// anything outside `src/lib/auth`, and even those used relative imports
// (`../../src/lib/auth/validation`), not the alias, so the gap was latent
// until now.
//
// Fixed centrally, here, with a plain `resolve.alias` entry — not a new
// dependency (`vite-tsconfig-paths` would be one more plugin for a single,
// static path mapping a few lines already do correctly), matching this
// project's established zero-unjustified-dependency posture (see ADR-0002's
// reasoning for not adopting `next-themes`). This mirrors tsconfig.json's
// `"@/*": ["./src/*"]` exactly — if that mapping ever changes, this must
// change with it.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
  },
});
