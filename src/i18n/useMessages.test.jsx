import React, { useEffect, useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Kbd from "../components/Kbd.jsx";
import { MessageProvider, useMessages } from "./index.js";

// A probe that renders a message and hands `t` to the test through a ref, so
// identity stability can be pinned alongside the strings.
const Probe = ({ record, k, params }) => {
  const t = useMessages();
  const last = useRef(null);
  if (last.current !== t) {
    last.current = t;
    record?.(t);
  }
  return <p>{t(k, params)}</p>;
};

const renderProbe = (props = {}) => {
  const seen = [];
  render(<Probe record={(t) => seen.push(t)} k={props.k ?? "common.save"} {...props} />);
  return seen;
};

describe("useMessages", () => {
  it("defaults to English with no provider", () => {
    renderProbe({ k: "common.save" });
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("defaults to English regardless of the browser locale", () => {
    // Shadow jsdom's navigator.language, then drop the shadow to restore it.
    Object.defineProperty(window.navigator, "language", { value: "de-DE", configurable: true });
    try {
      renderProbe({ k: "common.cancel" });
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    } finally {
      delete window.navigator.language;
    }
  });

  it("interpolates named placeholders and formats counts", () => {
    renderProbe({ k: "app.summaryTotal", params: { count: 2089 } });
    expect(screen.getByText("2,089 total bookmarks")).toBeInTheDocument();
  });

  it("picks the plural form from the count parameter", () => {
    renderProbe({ k: "digest.bookmarkCount", params: { count: 1 } });
    expect(screen.getByText("1 bookmark")).toBeInTheDocument();

    renderProbe({ k: "digest.bookmarkCount", params: { count: 2 } });
    expect(screen.getByText("2 bookmarks")).toBeInTheDocument();
  });

  it("falls back to the English message for a key a locale lacks", () => {
    render(
      <MessageProvider locale="de" messages={{ common: { save: "Speichern" } }}>
        <Probe k="common.save" />
        <Probe k="common.cancel" />
      </MessageProvider>
    );
    expect(screen.getByText("Speichern")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders the key string and warns once for a key missing everywhere", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const seen = renderProbe({ k: "surface.missing" });

    expect(screen.getByText("surface.missing")).toBeInTheDocument();
    expect(seen[0]("surface.missing")).toBe("surface.missing");
    expect(warn).toHaveBeenCalledTimes(1);

    warn.mockRestore();
  });

  it("keeps `t` stable across re-renders and locale changes", () => {
    const seen = [];
    const view = render(<Probe record={(t) => seen.push(t)} k="common.save" />);

    // A re-render that changes nothing the translator depends on keeps `t`.
    view.rerender(<Probe record={(t) => seen.push(t)} k="common.save" />);
    expect(seen).toHaveLength(1);

    // A new locale builds a new translator.
    render(
      <MessageProvider locale="de" messages={{}}>
        <Probe k="common.save" record={(t) => seen.push(t)} />
      </MessageProvider>
    );
    expect(seen).toHaveLength(2);
    expect(seen[1].locale).toBe("de");
  });

  it("exposes count and date formatters on the translator", () => {
    const seen = renderProbe({ k: "common.save" });
    const t = seen[0];

    expect(t.count(2089)).toBe("2,089");
    expect(t.date(new Date("2026-01-05T12:00:00Z"), { timeZone: "UTC", dateStyle: "long" })).toBe(
      "January 5, 2026"
    );
    expect(t.relative(-1, "day")).toBe("1 day ago");
  });
});

describe("MessageProvider", () => {
  it("serves a translated plural from the locale's own catalogue", () => {
    render(
      <MessageProvider
        locale="de"
        messages={{
          bulkEdit: {
            groupAria: {
              one: "Sammelbearbeitung von {count} ausgewähltem Lesezeichen",
              other: "Sammelbearbeitung von {count} ausgewählten Lesezeichen",
            },
          },
        }}
      >
        <Probe k="bulkEdit.groupAria" params={{ count: 3 }} />
      </MessageProvider>
    );
    expect(
      screen.getByText("Sammelbearbeitung von 3 ausgewählten Lesezeichen")
    ).toBeInTheDocument();
  });

  it("renders children untouched around the messages", () => {
    render(
      <MessageProvider locale="en" messages={{}}>
        <button type="button">Inside</button>
      </MessageProvider>
    );
    expect(screen.getByRole("button", { name: "Inside" })).toBeInTheDocument();
  });
});

describe("t.rich", () => {
  // Renders a message as nodes, so what t.rich builds can be read back as DOM.
  const RichProbe = ({ k, params }) => {
    const t = useMessages();
    return <p>{t.rich(k, params)}</p>;
  };
  const paragraph = (container) => container.querySelector("p");

  it("renders allow-listed emphasis as elements and the rest as one text run", () => {
    const { container } = render(<RichProbe k="help.tipsImportExport" />);

    expect(paragraph(container).innerHTML).toBe(
      "<strong>Import/Export</strong> lets you back up or restore bookmarks from JSON/HTML."
    );
  });

  it("formats a count that sits inside the emphasis", () => {
    render(<RichProbe k="importExport.willAdd" params={{ count: 2089 }} />);

    const count = screen.getByText("2,089");
    expect(count.tagName).toBe("STRONG");
    expect(screen.getByText(/This will add/)).toHaveTextContent(
      "This will add 2,089 bookmarks to your collection."
    );
  });

  it("keeps a node in its slot, where the locale's sentence puts it", () => {
    const { container } = render(
      <MessageProvider
        locale="de"
        messages={{ linkSweep: { brokenLinks: { other: "Nicht erreichbar: {chip}" } } }}
      >
        <RichProbe k="linkSweep.brokenLinks" params={{ count: 2, chip: <mark>2</mark> }} />
      </MessageProvider>
    );

    expect(paragraph(container).innerHTML).toBe("Nicht erreichbar: <mark>2</mark>");
  });

  it("reads as the sentence it was, with its key caps in place", () => {
    const { container } = render(
      <RichProbe
        k="app.clickHint"
        params={{
          shift: <Kbd>Shift</Kbd>,
          e: <Kbd>E</Kbd>,
        }}
      />
    );

    expect(paragraph(container).innerHTML).toBe(
      'Click to select, <kbd class="ui-kbd ">Shift</kbd>+click to open, double-click or <kbd class="ui-kbd ">E</kbd> to edit.'
    );
  });

  it("renders the key string for a key missing everywhere", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(<RichProbe k="surface.missing" />);
      expect(screen.getByText("surface.missing")).toBeInTheDocument();
    } finally {
      warn.mockRestore();
    }
  });

  it("never turns an element outside the allow-list into markup", () => {
    // A catalogue is data: whatever it says, only strong and em reach the page.
    const { container } = render(
      <MessageProvider
        locale="de"
        messages={{ common: { save: "<script>alert(1)</script>Speichern" } }}
      >
        <RichProbe k="common.save" />
      </MessageProvider>
    );

    expect(container.querySelector("script")).toBeNull();
    expect(paragraph(container).textContent).toBe("<script>alert(1)</script>Speichern");
  });

  it("falls back to the plain message when read without t.rich", () => {
    renderProbe({ k: "help.tipsImportExport" });
    expect(
      screen.getByText("Import/Export lets you back up or restore bookmarks from JSON/HTML.")
    ).toBeInTheDocument();
  });
});

describe("useMessages in effects", () => {
  it("is safe in a dependency array (stable identity)", () => {
    let ran = 0;
    const Runner = () => {
      const t = useMessages();
      useEffect(() => {
        ran += 1;
      }, [t]);
      return null;
    };
    render(<Runner />);
    expect(ran).toBe(1);
  });
});
