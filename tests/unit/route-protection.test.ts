import { describe, expect, it } from "vitest";

import { decideProxyAction } from "../../src/lib/auth/route-protection";

describe("decideProxyAction", () => {
  it("allows public routes for an anonymous visitor", () => {
    expect(decideProxyAction({ pathname: "/", search: "", isAuthenticated: false })).toEqual({
      action: "allow",
    });
    expect(
      decideProxyAction({ pathname: "/login", search: "", isAuthenticated: false }),
    ).toEqual({ action: "allow" });
    expect(
      decideProxyAction({
        pathname: "/auth/confirm",
        search: "?token_hash=x&type=email",
        isAuthenticated: false,
      }),
    ).toEqual({ action: "allow" });
  });

  it("redirects an unauthenticated visitor away from a protected route, preserving the destination", () => {
    const decision = decideProxyAction({ pathname: "/member", search: "", isAuthenticated: false });
    expect(decision).toEqual({
      action: "redirect",
      pathname: "/login",
      search: "?returnTo=%2Fmember",
    });
  });

  it("preserves the query string in the returnTo destination", () => {
    const decision = decideProxyAction({
      pathname: "/account",
      search: "?tab=security",
      isAuthenticated: false,
    });

    expect(decision.action).toBe("redirect");
    if (decision.action === "redirect") {
      const params = new URLSearchParams(decision.search);
      expect(params.get("returnTo")).toBe("/account?tab=security");
    }
  });

  it("allows an authenticated visitor to reach every protected route", () => {
    expect(decideProxyAction({ pathname: "/member", search: "", isAuthenticated: true })).toEqual(
      { action: "allow" },
    );
    expect(
      decideProxyAction({ pathname: "/account", search: "", isAuthenticated: true }),
    ).toEqual({ action: "allow" });
    expect(
      decideProxyAction({ pathname: "/update-password", search: "", isAuthenticated: true }),
    ).toEqual({ action: "allow" });
  });

  it("redirects an authenticated visitor away from /login and /register", () => {
    expect(decideProxyAction({ pathname: "/login", search: "", isAuthenticated: true })).toEqual({
      action: "redirect",
      pathname: "/member",
    });
    expect(
      decideProxyAction({ pathname: "/register", search: "", isAuthenticated: true }),
    ).toEqual({ action: "redirect", pathname: "/member" });
  });

  it("honors a safe returnTo when redirecting an authenticated visitor away from /login", () => {
    const decision = decideProxyAction({
      pathname: "/login",
      search: "?returnTo=%2Faccount",
      isAuthenticated: true,
    });
    expect(decision).toEqual({ action: "redirect", pathname: "/account" });
  });

  it("never honors an unsafe returnTo — falls back to the default destination", () => {
    const decision = decideProxyAction({
      pathname: "/login",
      search: "?returnTo=https://evil.example",
      isAuthenticated: true,
    });
    expect(decision).toEqual({ action: "redirect", pathname: "/member" });
  });

  it("does not create a redirect loop at the default authenticated destination", () => {
    const decision = decideProxyAction({ pathname: "/member", search: "", isAuthenticated: true });
    expect(decision.action).toBe("allow");
  });

  it("treats nested paths under a protected prefix as protected too", () => {
    const decision = decideProxyAction({
      pathname: "/member/anything",
      search: "",
      isAuthenticated: false,
    });
    expect(decision.action).toBe("redirect");
  });
});
