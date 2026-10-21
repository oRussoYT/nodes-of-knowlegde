import { describe, expect, it } from "vitest";

import { THEME_COOKIE_NAME, THEME_STORAGE_KEY } from "../../src/lib/theme/constants";
import { getThemeInitScript } from "../../src/lib/theme/inline-script";

// The generated script is exercised for real (not just string-matched) by
// running it via `new Function` against minimal stub `window`/`document`
// objects — this gives genuine behavioral coverage of the anti-FOUC logic
// without needing jsdom (not installed yet; see the M5.1 dependency
// boundary in the final report).
function runScript(options: { storedValue?: string | null; cookie?: string; throwOnRead?: boolean }) {
  const setAttributeCalls: Array<[string, string]> = [];

  const fakeWindow = {
    localStorage: {
      getItem(key: string) {
        if (options.throwOnRead) throw new Error("storage disabled");
        return key === THEME_STORAGE_KEY ? (options.storedValue ?? null) : null;
      },
    },
  };

  const fakeDocument = {
    cookie: options.cookie ?? "",
    documentElement: {
      setAttribute(name: string, value: string) {
        setAttributeCalls.push([name, value]);
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- exercising a
  // known, self-authored script string against stub globals, not user input.
  const run = new Function("window", "document", getThemeInitScript());
  run(fakeWindow, fakeDocument);

  return setAttributeCalls;
}

describe("getThemeInitScript", () => {
  it("references the shared storage key and cookie name", () => {
    const script = getThemeInitScript();
    expect(script).toContain(THEME_STORAGE_KEY);
    expect(script).toContain(THEME_COOKIE_NAME);
  });

  it("sets data-theme from a valid stored localStorage value", () => {
    expect(runScript({ storedValue: "dark" })).toEqual([["data-theme", "dark"]]);
  });

  it("falls back to the cookie when localStorage has no value", () => {
    expect(runScript({ storedValue: null, cookie: `${THEME_COOKIE_NAME}=light` })).toEqual([
      ["data-theme", "light"],
    ]);
  });

  it("ignores an invalid stored value and falls back to the cookie", () => {
    expect(runScript({ storedValue: "purple", cookie: `${THEME_COOKIE_NAME}=dark` })).toEqual([
      ["data-theme", "dark"],
    ]);
  });

  it("sets nothing when neither source has a valid theme (first-time visitor)", () => {
    expect(runScript({ storedValue: null, cookie: "" })).toEqual([]);
  });

  it("never throws, even if storage access throws", () => {
    expect(() => runScript({ throwOnRead: true })).not.toThrow();
  });

  it("sets nothing when storage access throws", () => {
    expect(runScript({ throwOnRead: true })).toEqual([]);
  });
});
