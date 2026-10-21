import { describe, expect, it } from "vitest";

import { isDevOnlyRouteBlocked } from "../../src/lib/dev-only-route";

describe("isDevOnlyRouteBlocked", () => {
  it("allows (does not block) exactly NODE_ENV=development", () => {
    expect(isDevOnlyRouteBlocked("development")).toBe(false);
  });

  it("blocks NODE_ENV=production", () => {
    expect(isDevOnlyRouteBlocked("production")).toBe(true);
  });

  it("blocks NODE_ENV=test — fail-safe is blocked, not an allowlist of only 'production'", () => {
    expect(isDevOnlyRouteBlocked("test")).toBe(true);
  });

  it("blocks an unset/undefined NODE_ENV", () => {
    expect(isDevOnlyRouteBlocked(undefined)).toBe(true);
  });

  it("blocks any unrecognized value", () => {
    expect(isDevOnlyRouteBlocked("staging")).toBe(true);
    expect(isDevOnlyRouteBlocked("")).toBe(true);
  });
});
