import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import OptionsModal from "./OptionsModal.jsx";

const { createLLM } = vi.hoisted(() => ({ createLLM: vi.fn() }));

// Only the network seam is faked; the real provider-readiness gate stays in the
// test, because that gate is what keeps a keyless hosted provider quiet.
vi.mock("../llm/index.js", async (importOriginal) => ({
  ...(await importOriginal()),
  createLLM,
}));

beforeEach(() => {
  createLLM.mockReset().mockImplementation(() => ({ listModels: async () => [] }));
});

const baseProps = {
  provider: "gemini",
  providerOptions: { apiKey: "" },
  onChange: () => {},
  onChangeOptions: () => {},
  currentTheme: "light",
  themes: {},
  onThemeChange: () => {},
  onThemeUpload: () => {},
  onClose: () => {},
};

describe("OptionsModal encryption UI (#29)", () => {
  it("renders through the unified design system's 2xl modal panel", () => {
    render(<OptionsModal {...baseProps} />);
    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass("ui-modal-panel");
    expect(panel).toHaveClass("ui-modal-panel--2xl");
  });

  it("enables encryption when the passphrase is valid and confirmed", async () => {
    const onEnableEncryption = vi.fn().mockResolvedValue(undefined);
    render(
      <OptionsModal
        {...baseProps}
        encryption={{ encrypted: false, locked: false }}
        onEnableEncryption={onEnableEncryption}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Passphrase (min 6 characters)"), {
      target: { value: "secret1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm passphrase"), {
      target: { value: "secret1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Encrypt API key" }));
    await waitFor(() => expect(onEnableEncryption).toHaveBeenCalledWith("secret1"));
  });

  it("rejects a mismatched passphrase without enabling", () => {
    const onEnableEncryption = vi.fn();
    render(
      <OptionsModal
        {...baseProps}
        encryption={{ encrypted: false, locked: false }}
        onEnableEncryption={onEnableEncryption}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Passphrase (min 6 characters)"), {
      target: { value: "secret1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm passphrase"), {
      target: { value: "secret2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Encrypt API key" }));
    expect(screen.getByText(/don't match/i)).toBeInTheDocument();
    expect(onEnableEncryption).not.toHaveBeenCalled();
  });

  it("rejects a too-short passphrase", () => {
    const onEnableEncryption = vi.fn();
    render(
      <OptionsModal
        {...baseProps}
        encryption={{ encrypted: false, locked: false }}
        onEnableEncryption={onEnableEncryption}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Passphrase (min 6 characters)"), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm passphrase"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Encrypt API key" }));
    expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    expect(onEnableEncryption).not.toHaveBeenCalled();
  });

  it("shows an error when unlock fails, and disables the API key field while locked", async () => {
    const onUnlock = vi.fn().mockResolvedValue(false);
    render(
      <OptionsModal
        {...baseProps}
        encryption={{ encrypted: true, locked: true }}
        onUnlock={onUnlock}
      />
    );
    expect(screen.getByPlaceholderText(/Locked — unlock below/i)).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Passphrase"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    await waitFor(() => expect(screen.getByText(/incorrect passphrase/i)).toBeInTheDocument());
    expect(onUnlock).toHaveBeenCalledWith("nope");
  });

  it("offers to remove encryption once unlocked", () => {
    const onDisableEncryption = vi.fn();
    render(
      <OptionsModal
        {...baseProps}
        encryption={{ encrypted: true, locked: false }}
        onDisableEncryption={onDisableEncryption}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove encryption" }));
    expect(onDisableEncryption).toHaveBeenCalled();
  });
});

describe("OptionsModal clear API key", () => {
  it("offers Clear for a stored key and empties it through the shared options path", () => {
    const onChangeOptions = vi.fn();
    render(
      <OptionsModal
        {...baseProps}
        providerOptions={{ apiKey: "sk-test" }}
        onChangeOptions={onChangeOptions}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear stored API key" }));
    expect(onChangeOptions).toHaveBeenCalledWith({ apiKey: "" });
  });

  it("hides Clear when no key is stored", () => {
    render(<OptionsModal {...baseProps} providerOptions={{ apiKey: "" }} />);
    expect(screen.queryByRole("button", { name: "Clear stored API key" })).not.toBeInTheDocument();
  });

  it("keeps Clear unavailable while the key is locked", () => {
    render(
      <OptionsModal
        {...baseProps}
        providerOptions={{ apiKey: "sk-test" }}
        encryption={{ encrypted: true, locked: true }}
      />
    );
    expect(screen.getByRole("button", { name: "Clear stored API key" })).toBeDisabled();
    expect(screen.getByPlaceholderText(/Locked — unlock below/i)).toBeDisabled();
  });

  it("clears the optional local-provider key the same way", () => {
    const onChangeOptions = vi.fn();
    render(
      <OptionsModal
        {...baseProps}
        provider="ollama"
        providerOptions={{ apiKey: "proxy-key" }}
        onChangeOptions={onChangeOptions}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear stored API key" }));
    expect(onChangeOptions).toHaveBeenCalledWith({ apiKey: "" });
  });
});

describe("OptionsModal effects preference", () => {
  it("reports the 3D effects toggle and reflects the persisted state", () => {
    const onEffectsChange = vi.fn();
    const { rerender } = render(
      <OptionsModal {...baseProps} effects onEffectsChange={onEffectsChange} />
    );

    const checkbox = screen.getByRole("checkbox", { name: /show 3d effects/i });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(onEffectsChange).toHaveBeenCalledWith(false);

    rerender(<OptionsModal {...baseProps} effects={false} onEffectsChange={onEffectsChange} />);
    expect(screen.getByRole("checkbox", { name: /show 3d effects/i })).not.toBeChecked();
  });
});

// Local providers need no key, but a server behind an authenticating proxy may
// ask for one; the field is offered for both and stays optional.
describe("OptionsModal local provider API key (optional)", () => {
  it("offers an optional key field for Ollama and reports what is typed", () => {
    const onChangeOptions = vi.fn();
    render(
      <OptionsModal
        {...baseProps}
        provider="ollama"
        providerOptions={{}}
        onChangeOptions={onChangeOptions}
      />
    );

    fireEvent.change(screen.getByLabelText("API Key (optional)"), {
      target: { value: "proxy-key" },
    });
    expect(onChangeOptions).toHaveBeenCalledWith({ apiKey: "proxy-key" });
  });

  it("offers the same field for LM Studio and locks it with the session", () => {
    render(
      <OptionsModal
        {...baseProps}
        provider="lmstudio"
        providerOptions={{}}
        encryption={{ encrypted: true, locked: true }}
      />
    );

    const field = screen.getByLabelText("API Key (optional)");
    expect(field).toBeDisabled();
    expect(screen.getByPlaceholderText(/Locked — unlock below/i)).toBe(field);
  });
});

describe("OptionsModal model refresh gating", () => {
  it("sends no model request when a hosted provider has no key yet", async () => {
    render(<OptionsModal {...baseProps} />);
    await act(async () => {});
    expect(createLLM).not.toHaveBeenCalled();
    // No doomed request, so no error banner from one.
    expect(screen.queryByText(/Model list failed/i)).toBeNull();
  });

  it("ignores the Refresh button while a hosted provider has no key", async () => {
    render(<OptionsModal {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh model list" }));
    await act(async () => {});
    expect(createLLM).not.toHaveBeenCalled();
  });

  // The positive paths go through the Refresh button, whose forceRefresh
  // bypasses the module-level models cache — earlier tests in this file warm
  // it, so a mount assertion here would be order-dependent, not informative.
  it("fetches once a hosted provider has a key", async () => {
    render(<OptionsModal {...baseProps} providerOptions={{ apiKey: "sk-test" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh model list" }));
    await waitFor(() =>
      expect(createLLM).toHaveBeenCalledWith("gemini", {
        apiKey: "sk-test",
        model: "",
        baseUrl: undefined,
      })
    );
  });

  it("still lists models keylessly for a local server", async () => {
    render(<OptionsModal {...baseProps} provider="ollama" providerOptions={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh model list" }));
    await waitFor(() =>
      expect(createLLM).toHaveBeenCalledWith("ollama", {
        apiKey: "",
        model: "",
        baseUrl: undefined,
      })
    );
  });
});
