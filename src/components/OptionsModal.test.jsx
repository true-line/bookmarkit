import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import OptionsModal from "./OptionsModal.jsx";
import { LocaleProvider } from "../i18n/LocaleProvider.js";

// #293 branches on the sidebar-viewport hook, which reads matchMedia. jsdom
// has none — the hook would default to the sheet — so every suite pins the
// composition it means to exercise (the BookmarkForm convention). The
// historical suites below were written for the dialog and stay there; the
// narrow-sheet suite overrides in its own beforeEach.
const installViewport = (isWide) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    query,
    matches: isWide,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
};
const clearViewport = () => {
  delete window.matchMedia;
};

beforeEach(() => {
  installViewport(true);
});

afterEach(() => {
  clearViewport();
});

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
    expect(onChangeOptions).toHaveBeenCalledWith({ apiKey: "" }, "gemini");
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
    expect(onChangeOptions).toHaveBeenCalledWith({ apiKey: "" }, "ollama");
  });
});

describe("OptionsModal effects preference", () => {
  it("stages the 3D effects toggle and commits it at Done", () => {
    const onEffectsChange = vi.fn();
    const onClose = vi.fn();
    render(
      <OptionsModal {...baseProps} effects onEffectsChange={onEffectsChange} onClose={onClose} />
    );

    const checkbox = screen.getByRole("checkbox", { name: /show 3d effects/i });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    // #293: the edit is staged — nothing writes until Done.
    expect(onEffectsChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onEffectsChange).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("follows a persisted change that arrives while open when the toggle is untouched", () => {
    const onEffectsChange = vi.fn();
    const { rerender } = render(
      <OptionsModal {...baseProps} effects onEffectsChange={onEffectsChange} />
    );
    const checkbox = screen.getByRole("checkbox", { name: /show 3d effects/i });

    rerender(<OptionsModal {...baseProps} effects={false} onEffectsChange={onEffectsChange} />);
    expect(checkbox).not.toBeChecked();
    expect(onEffectsChange).not.toHaveBeenCalled();
  });
});

// #290: the appearance section gains the mockups' built-in theme entries, the
// Reduce motion override, and the chosen-file status span.
describe("OptionsModal appearance settings (#290)", () => {
  it("offers the built-in theme entries under the mockup labels, uploads after", () => {
    render(<OptionsModal {...baseProps} themes={{ default: {}, ocean: {} }} />);
    const labels = [...screen.getByLabelText("Theme").options].map((o) => o.textContent);
    expect(labels).toEqual([
      "System default",
      "Light (Alabaster)",
      "Dark (Slate)",
      "High Contrast",
      "ocean",
    ]);
  });

  it("stages theme picks and the Reduce motion override, committing both at Done", () => {
    const onThemeChange = vi.fn();
    const onReduceMotionChange = vi.fn();
    render(
      <OptionsModal
        {...baseProps}
        themes={{ default: {} }}
        onThemeChange={onThemeChange}
        onReduceMotionChange={onReduceMotionChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "system" } });
    const motion = screen.getByRole("checkbox", { name: /reduce motion/i });
    expect(motion).not.toBeChecked();
    fireEvent.click(motion);
    // #293: staged, not written.
    expect(onThemeChange).not.toHaveBeenCalled();
    expect(onReduceMotionChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onThemeChange).toHaveBeenCalledWith("system");
    expect(onReduceMotionChange).toHaveBeenCalledWith(true);
  });

  it("names the chosen theme file in a status span, No file chosen before", () => {
    const onThemeUpload = vi.fn();
    const { container } = render(
      <OptionsModal {...baseProps} themes={{ default: {} }} onThemeUpload={onThemeUpload} />
    );

    expect(screen.getByRole("status")).toHaveTextContent("No file chosen");

    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(["{}"], "ocean.json")] } });
    expect(screen.getByRole("status")).toHaveTextContent("ocean.json");
    expect(onThemeUpload).toHaveBeenCalledTimes(1);
    expect(onThemeUpload.mock.calls[0][0].name).toBe("ocean.json");
  });

  // #292: the mockup's About, Privacy & Licensing section — version and
  // license beside the heading, and the two links as anchors to the targets
  // the extension is allowed to open.
  it("closes with an About, Privacy & Licensing section carrying version and links", () => {
    render(<OptionsModal {...baseProps} themes={{ default: {} }} />);

    expect(screen.getByRole("heading", { name: "About, Privacy & Licensing" })).toBeInTheDocument();
    expect(document.querySelector(".ui-url")).toHaveTextContent(/^v\d+\.\d+\.\d+ · MIT License$/);

    const privacy = screen.getByRole("link", { name: "Privacy Policy" });
    expect(privacy).toHaveAttribute(
      "href",
      "https://github.com/qwts/bookmarkit#privacy-and-storage"
    );
    const licenses = screen.getByRole("link", { name: "Open-Source Licenses" });
    expect(licenses).toHaveAttribute(
      "href",
      "https://github.com/qwts/bookmarkit/blob/main/THIRD-PARTY-NOTICES.md"
    );
    expect(licenses).toHaveClass("ui-button--secondary");
  });
});

// #291: the a11y sweep — the coarse-pointer 44px floor rides on the settings'
// checkbox rows: the label wraps the box, so the row is the touch target.
describe("OptionsModal accessibility sweep (#291)", () => {
  it("marks the settings checkbox rows as the coarse-pointer targets", () => {
    render(<OptionsModal {...baseProps} />);

    const rows = [...document.querySelectorAll(".ui-settings-row")];
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.tagName === "LABEL")).toBe(true);
  });
});

// Local providers need no key, but a server behind an authenticating proxy may
// ask for one; the field is offered for both and stays optional.
describe("OptionsModal local provider API key (optional)", () => {
  it("stages an optional key for Ollama and commits it at Done", () => {
    const onChangeOptions = vi.fn();
    const onClose = vi.fn();
    render(
      <OptionsModal
        {...baseProps}
        provider="ollama"
        providerOptions={{}}
        onChangeOptions={onChangeOptions}
        onClose={onClose}
      />
    );

    fireEvent.change(screen.getByLabelText("API Key (optional)"), {
      target: { value: "proxy-key" },
    });
    // #293: staged, not written.
    expect(onChangeOptions).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onChangeOptions).toHaveBeenCalledWith({ apiKey: "proxy-key" }, "ollama");
    expect(onClose).toHaveBeenCalledTimes(1);
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

// #298: the interface-language select. Rendered under the real
// LocaleProvider — the same provider the app and popup roots mount — so the
// select drives the actual persistence and the document's dir stamping.
describe("OptionsModal interface language (#298)", () => {
  let languageSelect;

  beforeEach(() => {
    localStorage.removeItem("bm_locale");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("lang");
    localStorage.removeItem("bm_locale");
  });

  const renderWithOptions = () => {
    render(
      <LocaleProvider>
        <OptionsModal {...baseProps} />
      </LocaleProvider>
    );
    languageSelect = screen.getByLabelText("Interface Language");
  };

  it("renders the select in the Appearance section with System default first", () => {
    renderWithOptions();
    expect(languageSelect).toBeInTheDocument();
    const labels = [...languageSelect.options].map((option) => option.textContent);
    expect(labels).toEqual(["System default", "English (LTR)"]);
    expect(languageSelect).toHaveValue("system");
  });

  it("stages an explicit choice and persists it at Done", () => {
    renderWithOptions();
    fireEvent.change(languageSelect, { target: { value: "en" } });
    // #293: staged — the select shows it, storage does not, until Done.
    expect(languageSelect).toHaveValue("en");
    expect(localStorage.getItem("bm_locale")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(localStorage.getItem("bm_locale")).toBe("en");
  });

  it("follows the late-loading stored choice and persists the return to system at Done", async () => {
    localStorage.setItem("bm_locale", "en");
    renderWithOptions();
    // The stored choice loads one tick after mount; the untouched select
    // follows it (#293's untouched-key tracking).
    const select = screen.getByLabelText("Interface Language");
    await waitFor(() => expect(select).toHaveValue("en"));

    fireEvent.change(select, { target: { value: "system" } });
    expect(localStorage.getItem("bm_locale")).toBe("en");

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(localStorage.getItem("bm_locale")).toBe("system");
  });
});

// #293: the decided save model — settings draft until Done. Edits stage
// without writing; Done commits the whole draft through the same write path
// as before and closes; Reset puts the dialog back the way it found it;
// every other exit discards.
describe("OptionsModal draft save model (#293)", () => {
  const renderDraft = (overrides = {}) => {
    const props = {
      ...baseProps,
      onChange: vi.fn(),
      onChangeOptions: vi.fn(),
      onThemeChange: vi.fn(),
      onReduceMotionChange: vi.fn(),
      onEffectsChange: vi.fn(),
      onRemoteFaviconsChange: vi.fn(),
      onWebMcpEnabledChange: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    };
    render(<OptionsModal {...props} />);
    return props;
  };

  const editEverything = () => {
    fireEvent.change(screen.getByLabelText("LLM Provider"), { target: { value: "openai" } });
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "sk-new" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /show 3d effects/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /reduce motion/i }));
  };

  it("stages every edit without writing any of it", () => {
    const props = renderDraft();
    editEverything();
    expect(props.onChange).not.toHaveBeenCalled();
    expect(props.onChangeOptions).not.toHaveBeenCalled();
    expect(props.onThemeChange).not.toHaveBeenCalled();
    expect(props.onReduceMotionChange).not.toHaveBeenCalled();
    expect(props.onEffectsChange).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("commits the whole draft through the write path at Done, then closes", () => {
    const props = renderDraft();
    editEverything();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onChange).toHaveBeenCalledWith("openai");
    expect(props.onChangeOptions).toHaveBeenCalledWith({ apiKey: "sk-new" }, "openai");
    expect(props.onEffectsChange).toHaveBeenCalledWith(false);
    expect(props.onReduceMotionChange).toHaveBeenCalledWith(true);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("Reset puts the dialog back the way it found it, and Done then writes that", () => {
    const props = renderDraft({ providerOptions: { apiKey: "sk-stored" } });
    editEverything();
    fireEvent.click(screen.getByRole("button", { name: "Revert unsaved setting changes" }));
    expect(screen.getByLabelText("LLM Provider")).toHaveValue("gemini");
    expect(screen.getByLabelText("API Key")).toHaveValue("sk-stored");
    expect(screen.getByRole("checkbox", { name: /show 3d effects/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /reduce motion/i })).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onChange).toHaveBeenCalledWith("gemini");
    expect(props.onChangeOptions).toHaveBeenCalledWith({ apiKey: "sk-stored" }, "gemini");
    expect(props.onEffectsChange).toHaveBeenCalledWith(true);
    expect(props.onReduceMotionChange).toHaveBeenCalledWith(false);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape discards the draft and closes", () => {
    const props = renderDraft();
    editEverything();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onChange).not.toHaveBeenCalled();
    expect(props.onChangeOptions).not.toHaveBeenCalled();
  });

  // Switching providers stages a switch, not just a label: the staged
  // options become the chosen provider's stored ones, and Done commits the
  // patch under that provider — in one breath with the switch itself.
  it("seeds the staged options from the chosen provider and commits under it", () => {
    const props = renderDraft({
      allProviderOptions: {
        gemini: { apiKey: "sk-gemini", model: "gemini-pro" },
        openai: { apiKey: "sk-openai-stored", model: "gpt-4o" },
      },
    });
    fireEvent.change(screen.getByLabelText("LLM Provider"), { target: { value: "openai" } });
    // The key field reads the newly chosen provider's stored key, not the
    // one the dialog opened with.
    expect(screen.getByLabelText("API Key")).toHaveValue("sk-openai-stored");

    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "sk-new-oai" } });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onChange).toHaveBeenCalledWith("openai");
    expect(props.onChangeOptions).toHaveBeenCalledWith(
      { apiKey: "sk-new-oai", model: "gpt-4o" },
      "openai"
    );
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("does not resurrect a cleared key at Reset and Done", () => {
    const onChange = vi.fn();
    const onChangeOptions = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <OptionsModal
        {...baseProps}
        providerOptions={{ apiKey: "sk-test" }}
        onChange={onChange}
        onChangeOptions={onChangeOptions}
        onClose={onClose}
      />
    );
    // Clear persists immediately (#293), so the parent's state moves too —
    // as the real wiring's would.
    fireEvent.click(screen.getByRole("button", { name: "Clear stored API key" }));
    expect(onChangeOptions).toHaveBeenCalledWith({ apiKey: "" }, "gemini");
    rerender(
      <OptionsModal
        {...baseProps}
        providerOptions={{ apiKey: "" }}
        onChange={onChange}
        onChangeOptions={onChangeOptions}
        onClose={onClose}
      />
    );

    // The staged bag is dirty by then, so the prop update cannot reach the
    // at-open snapshot — Clear updates it itself, and Reset must restore
    // the cleared state, not the key the dialog opened with.
    fireEvent.click(screen.getByRole("button", { name: "Revert unsaved setting changes" }));
    expect(screen.getByLabelText("API Key")).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onChangeOptions).toHaveBeenLastCalledWith({ apiKey: "" }, "gemini");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("names the save model in the dialog footer — changes apply at Done", () => {
    renderDraft();
    expect(screen.getByText("Changes apply when you choose Done.")).toBeInTheDocument();
  });
});

// #293: below `lg` the dialog is the mockup's full-page sheet — the back
// bar, the same body full width, and the sticky Reset/Done footer. Still a
// dialog to the keyboard, and every route out but Done discards the draft.
describe("OptionsModal narrow sheet (#293)", () => {
  beforeEach(() => {
    installViewport(false);
  });

  const renderSheet = (overrides = {}) => {
    const props = {
      ...baseProps,
      onChange: vi.fn(),
      onChangeOptions: vi.fn(),
      onEffectsChange: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    };
    render(<OptionsModal {...props} />);
    return props;
  };

  it("is the full-page sheet twin with the back bar and the sticky footer", () => {
    renderSheet();
    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveClass("ui-sheet");
    expect(sheet).toHaveClass("ui-sheet--options");
    expect(screen.getByRole("button", { name: "Back to bookmarks" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Options" })).toBeInTheDocument();
    expect(screen.getByText("Local-first configuration")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Revert unsaved setting changes" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("the back arrow closes with the draft discarded", () => {
    const props = renderSheet();
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "sk-new" } });
    fireEvent.click(screen.getByRole("button", { name: "Back to bookmarks" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onChangeOptions).not.toHaveBeenCalled();
  });

  it("Escape closes with the draft discarded", () => {
    const props = renderSheet();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onChangeOptions).not.toHaveBeenCalled();
  });

  it("Done in the sticky footer still commits", () => {
    const props = renderSheet();
    fireEvent.click(screen.getByRole("checkbox", { name: /show 3d effects/i }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onEffectsChange).toHaveBeenCalledWith(false);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

// #349: the status pill reads the asks' own readiness rule, not the raw
// provider name — an unset provider cannot claim to be active.
describe("OptionsModal active-provider pill (#349)", () => {
  it("reads active when a key makes the provider ready", () => {
    render(<OptionsModal {...baseProps} providerOptions={{ apiKey: "sk-live" }} />);
    expect(screen.getByText("Active: gemini")).toBeInTheDocument();
  });

  it("reads the provider and model when one is staged", () => {
    render(
      <OptionsModal {...baseProps} providerOptions={{ apiKey: "sk-live", model: "gemini-pro" }} />
    );
    expect(screen.getByText("Active: gemini / gemini-pro")).toBeInTheDocument();
  });

  it("says none while no provider is configured", () => {
    render(<OptionsModal {...baseProps} providerOptions={{}} />);
    expect(screen.getByText("No active provider")).toBeInTheDocument();
    expect(screen.queryByText(/Active:/)).not.toBeInTheDocument();
  });

  it("follows the draft as the key is typed, before Done", () => {
    render(<OptionsModal {...baseProps} providerOptions={{}} />);
    expect(screen.getByText("No active provider")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "sk-new" } });
    expect(screen.getByText("Active: gemini")).toBeInTheDocument();
  });

  it("keeps a locked provider active — its unlock pass-through, as the asks read it", () => {
    render(
      <OptionsModal
        {...baseProps}
        providerOptions={}
        encryption={{ encrypted: true, locked: true }}
      />
    );
    expect(screen.getByText("Active: gemini")).toBeInTheDocument();
  });
});
