import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useWebMcpTools, WEBMCP_TOOLS_KEY } from "./useWebMcpTools.js";

// The hook registers on the real global document, which is also where jsdom
// lives — so the API is stubbed directly on it, before the first render reads
// availability.
const installModelContext = () => {
  const registrations = new Map();
  const mc = {
    registrations,
    registerTool: vi.fn(async (tool, options = {}) => {
      registrations.set(tool.name, { tool, options });
    }),
  };
  Object.defineProperty(document, "modelContext", { value: mc, configurable: true });
  return mc;
};

let tools;

const Probe = ({ bookmarks = [], isLoading = false, loadError = null }) => {
  tools = useWebMcpTools({ bookmarks, isLoading, loadError });
  return (
    <div>
      <span data-testid="enabled">{tools.webMcpEnabled ? "on" : "off"}</span>
      <span data-testid="available">{tools.webMcpAvailable ? "yes" : "no"}</span>
    </div>
  );
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  delete document.modelContext;
  delete globalThis.chrome;
  tools = undefined;
});

describe("useWebMcpTools (#212)", () => {
  it("is off and dormant by default, even where the API exists", async () => {
    installModelContext();
    render(<Probe bookmarks={[{ id: "1" }]} />);

    await waitFor(() => expect(screen.getByTestId("enabled")).toHaveTextContent("off"));
    expect(screen.getByTestId("available")).toHaveTextContent("yes");
    expect(document.modelContext.registerTool).not.toHaveBeenCalled();
  });

  it("reports unavailable where the browser has no modelContext", () => {
    render(<Probe />);
    expect(screen.getByTestId("available")).toHaveTextContent("no");
  });

  it("registers both tools once enabled and the store opened cleanly", async () => {
    const mc = installModelContext();
    render(<Probe bookmarks={[{ id: "1" }]} />);

    await act(async () => {
      tools.setWebMcpEnabled(true);
    });

    await waitFor(() =>
      expect([...mc.registrations.keys()].sort()).toEqual(["list_folders", "search_bookmarks"])
    );
    expect(localStorage.getItem(WEBMCP_TOOLS_KEY)).toBe("true");
  });

  it("holds registration back while the store is loading or failed", async () => {
    const mc = installModelContext();
    const { rerender } = render(<Probe isLoading={true} />);
    await act(async () => {
      tools.setWebMcpEnabled(true);
    });
    expect(mc.registerTool).not.toHaveBeenCalled();

    rerender(<Probe isLoading={false} loadError={new Error("no store")} />);
    expect(mc.registerTool).not.toHaveBeenCalled();

    rerender(<Probe isLoading={false} loadError={null} />);
    await waitFor(() => expect(mc.registerTool).toHaveBeenCalled());
  });

  it("unregisters on unmount by aborting the registration signal", async () => {
    const mc = installModelContext();
    const { unmount } = render(<Probe bookmarks={[{ id: "1" }]} />);
    await act(async () => {
      tools.setWebMcpEnabled(true);
    });
    await waitFor(() => expect(mc.registerTool).toHaveBeenCalled());

    unmount();
    for (const { options } of mc.registrations.values()) {
      expect(options.signal.aborted).toBe(true);
    }
  });

  it("withdraws the tools when the toggle turns back off", async () => {
    const mc = installModelContext();
    render(<Probe bookmarks={[{ id: "1" }]} />);
    await act(async () => {
      tools.setWebMcpEnabled(true);
    });
    await waitFor(() => expect(mc.registerTool).toHaveBeenCalled());

    await act(async () => {
      tools.setWebMcpEnabled(false);
    });
    for (const { options } of mc.registrations.values()) {
      expect(options.signal.aborted).toBe(true);
    }
    expect(localStorage.getItem(WEBMCP_TOOLS_KEY)).toBe("false");
  });

  it("reads the persisted setting on mount, from either storage shape", async () => {
    installModelContext();
    // chrome.storage.local keeps real booleans; localStorage keeps strings.
    globalThis.chrome = {
      storage: {
        local: {
          get: async (_keys) => ({ [WEBMCP_TOOLS_KEY]: true }),
          set: async () => {},
        },
      },
    };
    render(<Probe bookmarks={[{ id: "1" }]} />);
    await waitFor(() => expect(screen.getByTestId("enabled")).toHaveTextContent("on"));
    expect(document.modelContext.registerTool).toHaveBeenCalled();
  });
});
