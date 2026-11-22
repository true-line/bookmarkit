import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InputField } from "./InputField.jsx";

describe("InputField (unified design system)", () => {
  it("describes a hint through aria-describedby", () => {
    render(
      <InputField id="url" label="URL" defaultValue="https://github.com" hint="Stored as typed." />
    );
    const input = screen.getByLabelText("URL");
    const describedBy = input.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy)).toHaveTextContent("Stored as typed.");
  });

  it("never reports invalid by color alone: aria-invalid plus an explicit message", () => {
    render(
      <InputField
        id="title"
        label="Title"
        validity="invalid"
        error="Enter a title before saving."
      />
    );
    const input = screen.getByLabelText("Title");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy)).toHaveTextContent("Enter a title before saving.");
  });

  it("defaults to dir=auto so user-entered copy reads in its own direction", () => {
    render(<InputField id="title" label="Title" />);
    expect(screen.getByLabelText("Title")).toHaveAttribute("dir", "auto");
  });
});
