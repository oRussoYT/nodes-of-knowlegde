import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "../../../src/components/ui/Switch";

// Renders a Switch inside a real <form> so form-submission semantics can be
// asserted against actual `FormData`, not just the presence/attributes of
// an input — this is the authoritative test for "does this submit the way
// a native checkbox would", per the investigation into Switch's form
// semantics (see Switch.tsx's file comment for the full reasoning).
function renderInForm(switchProps: ComponentProps<typeof Switch>) {
  let formEl!: HTMLFormElement;
  render(
    <form
      ref={(el) => {
        if (el) formEl = el;
      }}
    >
      <Switch {...switchProps} />
    </form>
  );
  return () => new FormData(formEl);
}

describe("Switch", () => {
  it("renders as role=switch with aria-checked reflecting defaultChecked (uncontrolled)", () => {
    render(<Switch defaultChecked aria-label="Dark mode" />);
    expect(screen.getByRole("switch", { name: "Dark mode" })).toHaveAttribute("aria-checked", "true");
  });

  it("defaults to unchecked", () => {
    render(<Switch aria-label="Dark mode" />);
    expect(screen.getByRole("switch", { name: "Dark mode" })).toHaveAttribute("aria-checked", "false");
  });

  it("toggles its own state when uncontrolled and clicked", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Dark mode" />);
    const toggle = screen.getByRole("switch", { name: "Dark mode" });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("is keyboard-activatable (native <button> semantics — Space/Enter)", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Dark mode" />);
    const toggle = screen.getByRole("switch", { name: "Dark mode" });

    toggle.focus();
    await user.keyboard(" ");

    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("calls onCheckedChange with the next value", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch aria-label="Dark mode" onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch", { name: "Dark mode" }));

    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("does not update its own displayed state when controlled — the caller owns it", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Dark mode" checked={false} onCheckedChange={() => {}} />);
    const toggle = screen.getByRole("switch", { name: "Dark mode" });

    await user.click(toggle);

    // Controlled: without the caller re-rendering with checked=true, the
    // displayed state must not change on its own.
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("does not toggle or call onCheckedChange when disabled", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch aria-label="Dark mode" disabled onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch", { name: "Dark mode" }));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("forwards its ref to the underlying <button>, not the form-only shadow input", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Switch ref={ref} aria-label="Dark mode" name="theme" />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toHaveAttribute("role", "switch");
  });

  describe("native form submission semantics", () => {
    it("renders no form-associated input at all when name is absent", () => {
      render(<Switch aria-label="Dark mode" defaultChecked />);
      // The switch is a <button>, which is never form-data-associated by
      // itself (type="button"); confirm no stray checkbox/hidden input was
      // introduced either, matching "no `name`, no form participation".
      expect(document.querySelector("input")).not.toBeInTheDocument();
    });

    it("a named, unchecked switch is absent from FormData — not present with a falsy value", () => {
      const getFormData = renderInForm({ name: "theme", "aria-label": "Dark mode" });

      const data = getFormData();
      // The one behavior every native checkbox/radio guarantees: unchecked
      // means the field is omitted entirely, never submitted as "off" or
      // "false" or any other falsy-looking string.
      expect(data.has("theme")).toBe(false);
      expect(data.get("theme")).toBeNull();
    });

    it("a named, checked switch submits value 'on'", () => {
      const getFormData = renderInForm({ name: "theme", "aria-label": "Dark mode", defaultChecked: true });

      const data = getFormData();
      expect(data.has("theme")).toBe(true);
      expect(data.get("theme")).toBe("on");
    });

    it("a controlled switch's FormData reflects new checked state after a rerender", () => {
      let formEl!: HTMLFormElement;
      const { rerender } = render(
        <form
          ref={(el) => {
            if (el) formEl = el;
          }}
        >
          <Switch name="theme" aria-label="Dark mode" checked={false} onCheckedChange={() => {}} />
        </form>
      );

      expect(new FormData(formEl).has("theme")).toBe(false);

      // `rerender` reconciles into the same container/DOM nodes (the <form>
      // element itself is not recreated, since it's the same element type
      // at the same tree position) — `formEl` from the ref callback above
      // is still the live node, so it's reused directly rather than
      // re-queried.
      rerender(
        <form ref={(el) => el && (formEl = el)}>
          <Switch name="theme" aria-label="Dark mode" checked={true} onCheckedChange={() => {}} />
        </form>
      );

      expect(new FormData(formEl).get("theme")).toBe("on");
    });

    it("a disabled, checked switch is excluded from FormData — disabled controls never submit", () => {
      const getFormData = renderInForm({
        name: "theme",
        "aria-label": "Dark mode",
        defaultChecked: true,
        disabled: true,
      });

      expect(getFormData().has("theme")).toBe(false);
    });
  });
});
