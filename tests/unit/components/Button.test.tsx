import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../../../src/components/ui/Button";

describe("Button", () => {
  it("renders its children as a native <button type='button'> by default", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("respects an explicit type override", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute("type", "submit");
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Click me</Button>);

    await user.click(screen.getByRole("button", { name: "Click me" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled and inert when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    );

    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies distinct classes per emphasis so variants are visually distinguishable", () => {
    render(
      <>
        <Button emphasis="primary">Primary</Button>
        <Button emphasis="destructive">Destructive</Button>
      </>
    );

    const primary = screen.getByRole("button", { name: "Primary" });
    const destructive = screen.getByRole("button", { name: "Destructive" });
    expect(primary.className).not.toBe(destructive.className);
  });
});
