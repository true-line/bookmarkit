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

  it("pairs the valid state with a success border, check icon and status line", () => {
    render(
      <InputField
        id="url"
        label="URL"
        dir="ltr"
        mono
        validity="valid"
        defaultValue="https://ghostty.org/docs/help/macos-login-shells"
        success="Valid public http(s) URL"
      />
    );
    const input = screen.getByLabelText("URL");
    expect(input).toHaveClass("ui-input--valid");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input.parentElement.querySelector(".ui-field-icon")).not.toBeNull();
    const status = document.getElementById(input.getAttribute("aria-describedby"));
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveTextContent("Valid public http(s) URL");
  });

  it("defaults to dir=auto so user-entered copy reads in its own direction", () => {
    render(<InputField id="title" label="Title" />);
    expect(screen.getByLabelText("Title")).toHaveAttribute("dir", "auto");
  });
});
