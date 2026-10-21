// Vitest setup file — extends `expect` with @testing-library/jest-dom's DOM
// matchers (`toBeInTheDocument`, `toHaveAttribute`, etc.) for every test in
// this suite, component or pure-function. Referenced by `setupFiles` in
// vitest.config.ts.
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Root cause of the cross-test DOM leakage ("Found multiple elements with
// the role 'switch' and name 'Dark mode'"): React Testing Library only
// self-registers its automatic post-test `cleanup()` when it detects a
// *global* `afterEach` function — the mechanism Jest provides by default.
// This project's vitest.config.ts does not set `test.globals: true` (and
// shouldn't, to keep test utilities explicit rather than ambient globals —
// consistent with this repo's existing style, which imports `describe`/
// `it`/`expect` explicitly in every test file rather than relying on
// globals). Because no global `afterEach` exists, RTL's internal
// auto-cleanup check silently no-ops — it doesn't error, it just never
// runs — so each `render()` call kept appending to `document.body` without
// ever unmounting the previous test's tree, and later tests in the same
// file queried a `document.body` still containing every prior render.
//
// This single, central `afterEach(cleanup)` is the fix: explicit
// registration, once, here — every test file that imports this setup file
// (all of them, via vitest.config.ts's `setupFiles`) gets real per-test
// DOM cleanup without needing its own import or `afterEach` boilerplate.
afterEach(() => {
  cleanup();
});

// jsdom does not implement these — Radix's Dialog/Drawer/Dropdown/Tooltip
// primitives call them internally (focus scope, dismissable layer,
// pointer-based interactions), so component tests that render them would
// otherwise throw on mount. This is a well-known, widely-used pattern for
// testing Radix under jsdom, not specific to this project. Minimal,
// behavior-neutral stubs — they exist so Radix's internals don't crash,
// not to assert anything about layout/scrolling themselves.
if (typeof window !== "undefined") {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }

  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}
