import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, IconButton } from "./Button.jsx";
import { Card } from "./Card.jsx";

describe("Button (unified design system)", () => {
  it("marks loading buttons busy and disabled, with a visible spinner", () => {
    render(<Button loading>Saving</Button>);
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector(".ui-spinner")).not.toBeNull();
  });

  it("maps the AI-assist intent to the unified violet token class", () => {
    render(<Button intent="tertiary">Suggest Tags</Button>);
    expect(screen.getByRole("button", { name: "Suggest Tags" })).toHaveClass("ui-button--tertiary");
  });

  it("exposes the screens' dialog and destructive intents", () => {
    render(
      <>
        <Button intent="secondary">Cancel</Button>
        <Button intent="destructive">Delete</Button>
        <Button intent="outlined">Asc</Button>
      </>
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("ui-button--secondary");
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("ui-button--destructive");
    expect(screen.getByRole("button", { name: "Asc" })).toHaveClass("ui-button--outlined");
  });
});

describe("IconButton (unified design system)", () => {
  it("names itself for assistive tech from the label prop", () => {
    render(
      <IconButton label="Open options">
        <svg aria-hidden="true" />
      </IconButton>
    );
    expect(screen.getByRole("button", { name: "Open options" })).toHaveAttribute(
      "aria-label",
      "Open options"
    );
  });
});

describe("Card (unified design system)", () => {
  it("activates interactive cards with Enter and Space like a button", () => {
    const onClick = vi.fn();
    render(
      <Card variant="interactive" onClick={onClick}>
        MDN Web Docs
      </Card>
    );
    const card = screen.getByRole("button", { name: "MDN Web Docs" });
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("marks the selected reading with the selected class and aria-pressed", () => {
    render(
      <Card variant="interactive-selected" onClick={() => {}}>
        MDN Web Docs
      </Card>
    );
    expect(screen.getByRole("button")).toHaveClass("ui-card--selected");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("reports the unselected interactive reading as not pressed", () => {
    render(
      <Card variant="interactive" onClick={() => {}}>
        MDN Web Docs
      </Card>
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("lets nested controls keep their events instead of firing the card action", () => {
    const onClick = vi.fn();
    render(
      <Card variant="interactive" onClick={onClick}>
        <a href="https://example.org">docs</a>
        <button type="button">remove</button>
        <span>MDN Web Docs</span>
      </Card>
    );
    const card = screen.getByText("MDN Web Docs").closest('[role="button"]');

    // Clicks and Enter on the nested controls reach only those controls.
    fireEvent.click(screen.getByText("docs"));
    fireEvent.click(screen.getByRole("button", { name: "remove" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "remove" }), { key: "Enter" });
    expect(onClick).not.toHaveBeenCalled();

    // Clicks and Enter on the card surface itself still activate the card.
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
