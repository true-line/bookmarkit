import React, { useCallback, useEffect } from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { getMessages, MessageProvider } from "./index.js";

// #307: getMessages() is for code that runs outside a component's render — a
// hook's callback, a utility — where useMessages() cannot be called.

// A stand-in catalogue holding one message, so a test can tell which catalogue
// was read; everything else falls back to English.
const pirate = { common: { save: "Savvy" } };
const KEY = "common.save";

// A callback built once with nothing in its dependencies, the way the hooks build
// theirs: it has to find the locale when it runs, not when it was created.
const raiser = { current: null };
const Raiser = () => {
  const raise = useCallback(() => getMessages()(KEY), []);
  useEffect(() => {
    raiser.current = raise;
  }, []);
  return null;
};

describe("getMessages", () => {
  it("reads English with no provider, and is the same translator on every call", () => {
    expect(getMessages()(KEY)).toBe("Save");
    expect(getMessages()).toBe(getMessages());
  });

  it("reads the catalogue of the provider above it", () => {
    render(
      <MessageProvider locale="en-PT" messages={pirate}>
        <Raiser />
      </MessageProvider>
    );

    expect(getMessages()(KEY)).toBe("Savvy");
    expect(raiser.current()).toBe("Savvy");
  });

  it("is published as the provider renders, so a child's effect already sees it", () => {
    // Children's effects run before their parent's; a provider that published
    // in an effect would be one render too late for this.
    const seen = [];
    const Child = () => {
      useEffect(() => {
        seen.push(getMessages()(KEY));
      }, []);
      return null;
    };

    render(
      <MessageProvider locale="en-PT" messages={pirate}>
        <Child />
      </MessageProvider>
    );

    expect(seen).toEqual(["Savvy"]);
  });

  it("follows a locale change without rebuilding the code that raises a message", () => {
    const { rerender } = render(
      <MessageProvider locale="en-PT" messages={pirate}>
        <Raiser />
      </MessageProvider>
    );
    const before = raiser.current;

    rerender(
      <MessageProvider>
        <Raiser />
      </MessageProvider>
    );

    expect(raiser.current).toBe(before);
    expect(raiser.current()).toBe("Save");
  });

  it("hands back to English when the provider unmounts", () => {
    const { unmount } = render(
      <MessageProvider locale="en-PT" messages={pirate}>
        <Raiser />
      </MessageProvider>
    );

    unmount();

    expect(getMessages()(KEY)).toBe("Save");
  });

  it("falls back to English for a key the locale lacks", () => {
    render(
      <MessageProvider locale="en-PT" messages={pirate}>
        <span />
      </MessageProvider>
    );

    expect(getMessages()("common.cancel")).toBe("Cancel");
  });
});
