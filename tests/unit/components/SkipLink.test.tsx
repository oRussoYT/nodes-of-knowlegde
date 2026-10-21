import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SkipLink } from "../../../src/components/layout/SkipLink";

describe("SkipLink", () => {
  it("links to #main-content", () => {
    render(<SkipLink />);
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
  });

  it("is visually hidden until focused (sr-only, revealed by focus:not-sr-only)", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link.className).toContain("sr-only");
    expect(link.className).toContain("focus:not-sr-only");
  });
});
