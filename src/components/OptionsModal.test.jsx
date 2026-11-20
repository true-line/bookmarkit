import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OptionsModal from "./OptionsModal.jsx";

// Avoid real LLM/model-fetch side effects.
vi.mock("../llm/index.js", () => ({
  LLM_PROVIDERS: { GEMINI: "gemini", OPENAI: "openai", OLLAMA: "ollama", LMSTUDIO: "lmstudio" },
  createLLM: () => ({ listModels: async () => [] }),
}));

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
