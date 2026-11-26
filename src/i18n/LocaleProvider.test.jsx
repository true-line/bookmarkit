import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { LocaleProvider, useLocale } from "./LocaleProvider.js";
import { useMessages } from "./index.js";
import { SYSTEM_LOCALE } from "./locales.js";

// #298: the provider owns the direction contract — dir/lang stamped on the
// document element, the choice persisted, the catalogue mounted. The shipped
// registry is English-only today, so the RTL half of the contract is driven
// against a synthetic registry entry: exactly the shape a future Arabic or
// Hebrew catalogue arrives in (its messages missing, its direction set).

// A registry with a right-to-left entry whose catalogue does not exist.
const WITH_ARABIC = [
  { code: "en", label: "English (LTR)" },
  { code: "ar", label: "العربية (RTL)" },
];

// Reads the context so tests can drive and observe it the way the selector
// does, and captures one message so the catalogue underneath is assertable.
function Probe({ onMessage }) {
  const { choice, locale, dir, setLocale } = useLocale();
  const t = useMessages();
  onMessage?.(t);
  return (
    <div>
      <span data-testid="choice">{choice}</span>
      <span data-testid="locale">{locale}</span>
      <span data-testid="dir">{dir}</span>
      <button onClick={() => setLocale("ar")}>choose arabic</button>
      <button onClick={() => setLocale(SYSTEM_LOCALE)}>choose system</button>
    </div>
  );
}

function mount(probeProps = {}, locales = WITH_ARABIC) {
  return render(
    <LocaleProvider locales={locales}>
      <Probe {...probeProps} />
    </LocaleProvider>
  );
}

function root() {
  return document.documentElement;
}

beforeEach(() => {
  root().removeAttribute("dir");
  root().removeAttribute("lang");
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  root().removeAttribute("dir");
  root().removeAttribute("lang");
  localStorage.clear();
});

describe("LocaleProvider (#298)", () => {
  it("stamps dir and lang for the resolved locale on the document element", () => {
    mount();
    expect(root().getAttribute("dir")).toBe("ltr");
    expect(root().getAttribute("lang")).toBe("en");
    expect(screen.getByTestId("choice").textContent).toBe("system");
    expect(screen.getByTestId("locale").textContent).toBe("en");
  });

  it("puts the document's original attributes back on unmount", () => {
    root().setAttribute("dir", "auto");
    root().setAttribute("lang", "en-US");
    const view = mount();
    expect(root().getAttribute("dir")).toBe("ltr");
    view.unmount();
    expect(root().getAttribute("dir")).toBe("auto");
    expect(root().getAttribute("lang")).toBe("en-US");
  });

  it("flips the document to rtl for a right-to-left locale", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "choose arabic" }));
    expect(screen.getByTestId("choice").textContent).toBe("ar");
    expect(screen.getByTestId("dir").textContent).toBe("rtl");
    expect(root().getAttribute("dir")).toBe("rtl");
    expect(root().getAttribute("lang")).toBe("ar");
  });

  it("renders the English copy for a locale whose catalogue has not landed", () => {
    let message;
    mount({ onMessage: (t) => (message = t("options.languageLabel")) });
    fireEvent.click(screen.getByRole("button", { name: "choose arabic" }));
    // The Arabic catalogue does not exist, so the sentence stays English even
    // though the locale — and with it the number and date formats — switched.
    expect(message).toBe("Interface Language");
  });

  it("keeps the choice across a remount", async () => {
    const first = mount();
    fireEvent.click(first.getByRole("button", { name: "choose arabic" }));
    expect(localStorage.getItem("bm_locale")).toBe("ar");
    first.unmount();

    mount();
    // The stored choice loads one tick after mount, as in a real page load —
    // and the document's stamping is an effect behind that commit, so the
    // wait is on the stamp itself (asserting it right after a different
    // signal resolved once lost that race on CI, #298).
    await waitFor(() => expect(root().getAttribute("dir")).toBe("rtl"));
    expect(screen.getByTestId("locale").textContent).toBe("ar");
  });

  it("honors the persisted choice on first mount", async () => {
    localStorage.setItem("bm_locale", "ar");
    mount();
    // The stored choice loads one tick after mount, and the root's stamping
    // is the effect behind that commit — wait on the stamp itself, not on a
    // signal that can land one render ahead of it (the CI flake, #298).
    await waitFor(() => expect(root().getAttribute("dir")).toBe("rtl"));
    expect(screen.getByTestId("locale").textContent).toBe("ar");
  });

  it("ignores a persisted choice the registry no longer ships", async () => {
    localStorage.setItem("bm_locale", "zz");
    mount();
    await waitFor(() => expect(screen.queryByTestId("locale").textContent).toBeTruthy());
    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(root().getAttribute("dir")).toBe("ltr");
  });

  it("resolves the system choice against the browser's languages", () => {
    const descriptor = Object.getOwnPropertyDescriptor(window.navigator, "languages");
    Object.defineProperty(window.navigator, "languages", {
      get: () => ["he-IL", "ar-EG", "en"],
      configurable: true,
    });
    try {
      mount();
      // No exact or base-language match for he, so the next preference wins.
      expect(screen.getByTestId("locale").textContent).toBe("ar");
      expect(root().getAttribute("dir")).toBe("rtl");
    } finally {
      if (descriptor) {
        Object.defineProperty(window.navigator, "languages", descriptor);
      } else {
        Reflect.deleteProperty(window.navigator, "languages");
      }
    }
  });

  it("returns to the system choice when the selector asks for it", async () => {
    localStorage.setItem("bm_locale", "ar");
    mount();
    await waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("ar"));
    fireEvent.click(screen.getByRole("button", { name: "choose system" }));
    expect(localStorage.getItem("bm_locale")).toBe("system");
    expect(screen.getByTestId("choice").textContent).toBe("system");
    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(root().getAttribute("dir")).toBe("ltr");
  });
});
