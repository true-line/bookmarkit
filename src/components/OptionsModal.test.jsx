import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OptionsModal from "./OptionsModal.jsx";

// Avoid real LLM/model-fetch side effects.
vi.mock("../llm/index.js", () => ({
  LLM_PROVIDERS: { GEMINI: "gemini", OPENAI: "openai" },
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
