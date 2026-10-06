import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import SceneFallback from "./SceneFallback.jsx";

// Suspense covers a pending scene import; these tests pin down the other two
// failure paths: a scene that throws when rendered (same boundary a rejected
// dynamic import lands in) must resolve to the static glyph without ever
// reaching the app-wide error boundary.

const Thrower = () => {
  throw new Error("scene failed");
};

describe("SceneFallback", () => {
  it("renders children while the scene is healthy", () => {
    const { container } = render(
      <SceneFallback fallback={<p>fallback</p>}>
        <p>child</p>
      </SceneFallback>
    );
    expect(container).toHaveTextContent("child");
    expect(container).not.toHaveTextContent("fallback");
  });

  it("renders the fallback when the scene throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <SceneFallback fallback={<p>fallback</p>}>
        <Thrower />
      </SceneFallback>
    );
    expect(container).toHaveTextContent("fallback");
    expect(container).not.toHaveTextContent("child");
    errorSpy.mockRestore();
  });

  it("keeps a failed brand scene from replacing the app UI", async () => {
    vi.resetModules();
    vi.doMock("./BrandMarkScene.jsx", () => ({
      default: () => {
        throw new Error("chunk failed");
      },
    }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { default: BrandMark } = await import("./BrandMark.jsx");

    const { container } = render(<BrandMark enabled />);

    await waitFor(() => expect(container.querySelector(".ds-brand-glyph")).toBeTruthy());
    errorSpy.mockRestore();
    vi.doUnmock("./BrandMarkScene.jsx");
    vi.resetModules();
  });

  it("keeps a failed empty-stack scene from replacing the app UI", async () => {
    vi.resetModules();
    vi.doMock("./EmptyStackScene.jsx", () => ({
      default: () => {
        throw new Error("chunk failed");
      },
    }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { default: EmptyStack } = await import("./EmptyStack.jsx");

    const { container } = render(<EmptyStack enabled />);

    await waitFor(() => expect(container.querySelector("svg[aria-hidden='true']")).toBeTruthy());
    errorSpy.mockRestore();
    vi.doUnmock("./EmptyStackScene.jsx");
    vi.resetModules();
  });
});
