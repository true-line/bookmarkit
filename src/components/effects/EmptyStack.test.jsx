import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React from "react";
import EmptyStack, { EmptyStackGlyph } from "./EmptyStack.jsx";

// These tests use the real sceneRuntime and the real three import: jsdom has no
// WebGL, so this is the honest "WebGL unavailable → static fallback" path.

const glyph = (container) => container.querySelector("svg[aria-hidden='true']");
const canvas = () => document.querySelector(".ds-effects-canvas");

describe("EmptyStack", () => {
  it("shows the static icon when the effects preference is off", () => {
    const { container } = render(<EmptyStack enabled={false} />);
    expect(glyph(container)).not.toBeNull();
    expect(canvas()).toBeNull();
  });

  it("falls back to the static icon when WebGL is unavailable", async () => {
    const { container } = render(<EmptyStack enabled />);

    await waitFor(() => expect(glyph(container)).not.toBeNull());
    expect(canvas()).toBeNull();
  });

  it("exposes the glyph for the Suspense fallback", () => {
    const { container } = render(<EmptyStackGlyph />);
    expect(container.querySelector("svg[aria-hidden='true']")).not.toBeNull();
  });
});
