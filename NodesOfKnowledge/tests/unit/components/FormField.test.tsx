import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormField } from "../../../src/components/ui/FormField";

// FormField's public API and accessible behavior must be unchanged after
// being refactored in place onto Label/Input/HelperText/FieldError and
// design tokens (M5.1) — see FormField.tsx's file comment and
// docs/m5-application-ui-design-system.md item 2's acceptance criteria.
// This is a regression test for that refactor, not new-feature coverage.
describe("FormField", () => {
  it("associates the label with the input via htmlFor/id, defaulting id to name", () => {
    render(<FormField label="Email" name="email" type="email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("id", "email");
    expect(input).toHaveAttribute("type", "email");
  });

  it("respects an explicit id override", () => {
    render(<FormField label="Email" name="email" id="custom-id" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "custom-id");
  });

  it("renders hint text and wires it via aria-describedby", () => {
    render(<FormField label="Email" name="email" hint="We'll never share this." />);
    const input = screen.getByLabelText("Email");
    const hint = screen.getByText("We'll never share this.");

    expect(hint).toHaveAttribute("id", "email-hint");
    expect(input.getAttribute("aria-describedby")).toContain("email-hint");
  });

  it("renders an error with role=alert, marks the field invalid, and wires aria-describedby", () => {
    render(<FormField label="Email" name="email" error="Enter a valid email address." />);
    const input = screen.getByLabelText("Email");
    const error = screen.getByRole("alert");

    expect(error).toHaveTextContent("Enter a valid email address.");
    expect(error).toHaveAttribute("id", "email-error");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain("email-error");
  });

  it("includes both hint and error ids in aria-describedby when both are present", () => {
    render(<FormField label="Email" name="email" hint="A hint." error="An error." />);
    const describedBy = screen.getByLabelText("Email").getAttribute("aria-describedby");

    expect(describedBy).toContain("email-hint");
    expect(describedBy).toContain("email-error");
  });

  it("has no aria-invalid or aria-describedby when there is no hint or error", () => {
    render(<FormField label="Email" name="email" />);
    const input = screen.getByLabelText("Email");

    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("forwards arbitrary native <input> props (existing M4 call-site pattern)", () => {
    render(<FormField label="Email" name="email" type="email" required placeholder="you@example.com" />);
    const input = screen.getByLabelText("Email");

    expect(input).toBeRequired();
    expect(input).toHaveAttribute("placeholder", "you@example.com");
  });
});
