import { describe, expect, it } from "vitest";

import { THEME_COOKIE_NAME } from "../../src/lib/theme/constants";
import { isValidTheme, parseThemeCookie, serializeThemeCookie } from "../../src/lib/theme/parse";

describe("isValidTheme", () => {
  it("accepts exactly the two known themes", () => {
    expect(isValidTheme("light")).toBe(true);
    expect(isValidTheme("dark")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isValidTheme("system")).toBe(false);
    expect(isValidTheme("")).toBe(false);
    expect(isValidTheme(null)).toBe(false);
    expect(isValidTheme(undefined)).toBe(false);
    expect(isValidTheme(1)).toBe(false);
  });
});

describe("parseThemeCookie", () => {
  it("returns null for an empty or missing cookie string", () => {
    expect(parseThemeCookie(null)).toBeNull();
    expect(parseThemeCookie(undefined)).toBeNull();
    expect(parseThemeCookie("")).toBeNull();
  });

  it("finds the theme cookie among other cookies", () => {
    expect(parseThemeCookie(`foo=bar; ${THEME_COOKIE_NAME}=dark; baz=qux`)).toBe("dark");
  });

  it("finds the theme cookie when it is the only one", () => {
    expect(parseThemeCookie(`${THEME_COOKIE_NAME}=light`)).toBe("light");
  });

  it("returns null when the cookie value is not a valid theme", () => {
    expect(parseThemeCookie(`${THEME_COOKIE_NAME}=purple`)).toBeNull();
  });

  it("returns null when the theme cookie is absent", () => {
    expect(parseThemeCookie("foo=bar; baz=qux")).toBeNull();
  });

  it("tolerates extra whitespace around pairs", () => {
    expect(parseThemeCookie(`foo=bar;  ${THEME_COOKIE_NAME}=dark ; baz=qux`)).toBe("dark");
  });
});

describe("serializeThemeCookie", () => {
  it("produces a Path=/, SameSite=Lax, ~1 year cookie string", () => {
    const result = serializeThemeCookie("dark");
    expect(result).toContain(`${THEME_COOKIE_NAME}=dark`);
    expect(result).toContain("path=/");
    expect(result).toContain("SameSite=Lax");
    expect(result).toMatch(/max-age=31536000/);
  });

  it("round-trips through parseThemeCookie", () => {
    const cookie = serializeThemeCookie("light").split(";")[0];
    expect(parseThemeCookie(cookie)).toBe("light");
  });
});
