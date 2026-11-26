import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ImportExportContent from "./ImportExportContent.jsx";

const setup = ({ bookmarks = [] } = {}) => {
  const showMessage = vi.fn();
  const onImportJson = vi.fn().mockResolvedValue(undefined);
  render(
    <ImportExportContent
      bookmarks={bookmarks}
      onClose={() => {}}
      onImportJson={onImportJson}
      onImportHtml={() => {}}
      showMessage={showMessage}
    />
  );
  return { showMessage, onImportJson };
};

const chooseJsonFile = (contents) => {
  fireEvent.click(screen.getByRole("tab", { name: "Import JSON" }));
  const input = screen.getByLabelText("Upload JSON File");
  const file = new File([contents], "bookmarks.json", { type: "application/json" });
  fireEvent.change(input, { target: { files: [file] } });
  return input;
};

describe("ImportExportContent file upload (#25)", () => {
  it("clears the input so the same file can be picked again after a failure", async () => {
    const { showMessage } = setup();
    const input = chooseJsonFile("{ not json");

    await waitFor(() => expect(showMessage).toHaveBeenCalled());
    // A file input with no value has no selection, which is what makes the
    // browser fire change again for the same file.
    expect(input.value).toBe("");
  });

  it("counts only the entries it can actually import", async () => {
    setup();
    chooseJsonFile(
      JSON.stringify([
        { title: "Keep", url: "https://example.com/one" },
        { title: "No URL" },
        { title: "Unsafe", url: "javascript:alert(1)" },
        { title: "Keep too", url: "https://example.com/two" },
      ])
    );

    const confirmation = await screen.findByText(/bookmarks to your collection/);
    expect(confirmation).toHaveTextContent("This will add 2 bookmarks");
  });

  it("hands the store the normalized entries, not the raw file", async () => {
    const { onImportJson } = setup();
    chooseJsonFile(JSON.stringify([{ id: "from-file", url: "https://example.com/", rating: "4" }]));

    fireEvent.click(await screen.findByRole("button", { name: "Import" }));

    await waitFor(() => expect(onImportJson).toHaveBeenCalled());
    const [imported] = onImportJson.mock.calls[0];
    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({ url: "https://example.com/", rating: 4 });
    expect(imported[0]).not.toHaveProperty("id");
  });

  it("refuses a file with nothing importable instead of confirming an empty import", async () => {
    const { showMessage } = setup();
    chooseJsonFile(JSON.stringify([{ title: "No URL" }]));

    await waitFor(() =>
      expect(showMessage).toHaveBeenCalledWith(expect.stringContaining("No bookmarks"), "error")
    );
    expect(screen.queryByText(/to your collection/)).toBeNull();
  });

  it("rejects JSON that is not an array of bookmarks", async () => {
    const { showMessage } = setup();
    chooseJsonFile(JSON.stringify({ bookmarks: [] }));

    await waitFor(() =>
      expect(showMessage).toHaveBeenCalledWith(
        expect.stringContaining("Expected an array"),
        "error"
      )
    );
  });
});

// #287 widened the panel: a Markdown link list imports and exports alongside
// JSON/HTML, and the confirmation names its file and lets skip-existing be a
// decision — with the count showing what the choice actually leaves.
describe("ImportExportContent markdown and skip-existing (#287)", () => {
  it("exports markdown alongside JSON and HTML, with the mockup's copy", () => {
    setup({
      bookmarks: [{ id: "1", title: "MDN Web Docs", url: "https://developer.mozilla.org/" }],
    });

    expect(screen.getByLabelText("Markdown Export (Link List)")).toHaveValue(
      "- [MDN Web Docs](https://developer.mozilla.org/)\n"
    );
    expect(screen.getByRole("link", { name: "Export JSON" })).toHaveAttribute(
      "download",
      "bookmarks.json"
    );
    expect(screen.getByRole("link", { name: "Export HTML" })).toHaveAttribute(
      "download",
      "bookmarks.html"
    );
    expect(screen.getByRole("link", { name: "Export Markdown" })).toHaveAttribute(
      "download",
      "bookmarks.md"
    );
  });

  it("stages a markdown link list through the entry path the JSON import uses", async () => {
    const { onImportJson } = setup();
    fireEvent.click(screen.getByRole("tab", { name: "Import Markdown" }));
    const input = screen.getByLabelText("Upload Markdown File");
    const file = new File(
      ["# Reading\n- [Example](https://example.com/)\n  - [Other](https://other.test/)"],
      "links.md",
      { type: "text/markdown" }
    );
    fireEvent.change(input, { target: { files: [file] } });

    const confirmation = await screen.findByText(/bookmarks? to your collection/);
    expect(confirmation).toHaveTextContent("This will add 2 bookmarks");
    expect(screen.getByText("Chosen file: links.md")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(onImportJson).toHaveBeenCalled());
    const [imported, replaceAll, skipExisting] = onImportJson.mock.calls[0];
    expect(imported).toHaveLength(2);
    expect(imported[0]).toMatchObject({ title: "Example", url: "https://example.com/" });
    expect(replaceAll).toBe(false);
    expect(skipExisting).toBe(true);
  });

  it("refuses markdown that holds no links", async () => {
    const { showMessage } = setup();
    fireEvent.click(screen.getByRole("tab", { name: "Import Markdown" }));
    fireEvent.change(screen.getByLabelText("Paste Markdown Data"), {
      target: { value: "Just prose, nothing to click." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import Markdown Links" }));

    await waitFor(() =>
      expect(showMessage).toHaveBeenCalledWith(expect.stringContaining("No bookmarks"), "error")
    );
  });

  it("counts html links it would refuse, not rows the file happens to hold", async () => {
    setup();
    fireEvent.click(screen.getByRole("tab", { name: "Import HTML" }));
    const input = screen.getByLabelText("Upload HTML File (Browser Export)");
    const file = new File(
      [
        [
          "<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p>",
          '<DT><A HREF="https://example.com/ok">Ok</A>',
          '<DT><A HREF="javascript:alert(1)">Unsafe</A>',
          "</DL><p>",
        ].join("\n"),
      ],
      "bookmarks.html",
      { type: "text/html" }
    );
    fireEvent.change(input, { target: { files: [file] } });

    const confirmation = await screen.findByText(/bookmarks? to your collection/);
    expect(confirmation).toHaveTextContent("This will add 1 bookmark");
  });

  it("shows what skip-existing leaves and lets it be turned off", async () => {
    const { onImportJson } = setup({
      bookmarks: [{ id: "1", title: "Held", url: "https://example.com/dupe" }],
    });
    chooseJsonFile(
      JSON.stringify([
        { title: "Held", url: "https://example.com/dupe" },
        { title: "Fresh", url: "https://example.com/fresh" },
      ])
    );

    // Checked by default — the mockup's state, and what the store edge has
    // always done. The confirmation names the duplicate rather than promising it.
    expect(
      await screen.findByText("1 already in your library will be skipped.")
    ).toBeInTheDocument();
    expect(screen.getByText(/bookmarks? to your collection/)).toHaveTextContent(
      "This will add 1 bookmark"
    );

    fireEvent.click(screen.getByLabelText("Skip URLs already in library"));
    expect(screen.getByText(/bookmarks? to your collection/)).toHaveTextContent(
      "This will add 2 bookmarks"
    );
    expect(screen.queryByText(/already in your library/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(onImportJson).toHaveBeenCalled());
    expect(onImportJson.mock.calls[0][2]).toBe(false);
  });

  it("cannot confirm an import whose every entry is already in the library", async () => {
    setup({ bookmarks: [{ id: "1", title: "Held", url: "https://example.com/dupe" }] });
    chooseJsonFile(JSON.stringify([{ title: "Held", url: "https://example.com/dupe" }]));

    await screen.findByText(/bookmarks? to your collection/);
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("retires the skip-existing choice when replace makes it moot", async () => {
    setup({ bookmarks: [{ id: "1", title: "Held", url: "https://example.com/dupe" }] });
    chooseJsonFile(JSON.stringify([{ title: "Fresh", url: "https://example.com/fresh" }]));

    fireEvent.click(await screen.findByRole("radio", { name: "Replace all existing bookmarks" }));

    const checkbox = screen.getByLabelText("Skip URLs already in library");
    expect(checkbox).toBeDisabled();
    expect(screen.getByText(/bookmarks? to your collection/)).toHaveTextContent(
      "This will add 1 bookmark"
    );
  });

  it("does not name a chosen file when the import was pasted", async () => {
    setup();
    fireEvent.click(screen.getByRole("tab", { name: "Import JSON" }));
    fireEvent.change(screen.getByLabelText("Paste JSON Data"), {
      target: { value: JSON.stringify([{ title: "Typed", url: "https://example.com/typed" }]) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import JSON Data" }));

    await screen.findByText(/bookmarks? to your collection/);
    expect(screen.queryByText(/Chosen file:/)).toBeNull();
  });
});

// The unified-dialog migration (#247) moved the panel into the design-system
// Modal itself — the shell it now owns is worth pinning, since the round-trip
// tests above only exercise the content.
describe("ImportExportContent unified dialog shell (#247)", () => {
  it("describes the dialog with the mockup's description line", () => {
    setup();

    const describedBy = screen.getByRole("dialog").getAttribute("aria-describedby");
    expect(document.getElementById(describedBy)).toHaveTextContent(
      "Back up your collection or migrate from another browser."
    );
  });

  it("closes through the dialog footer", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <ImportExportContent
        bookmarks={[]}
        onClose={onClose}
        onImportJson={() => {}}
        onImportHtml={() => {}}
        showMessage={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    // The unified modal closes through its 150ms exit animation.
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("accepts a dropped file on the zone, not just a picked one", async () => {
    setup();
    fireEvent.click(screen.getByRole("tab", { name: "Import JSON" }));
    const input = screen.getByLabelText("Upload JSON File");
    fireEvent.drop(input.closest("label"), {
      dataTransfer: {
        files: [
          new File(
            [JSON.stringify([{ title: "Dropped", url: "https://example.com/drop" }])],
            "dropped.json",
            { type: "application/json" }
          ),
        ],
      },
    });

    // The count rides a <strong>, and findByText matches direct text nodes only,
    // so the singular reading needs the optional plural.
    const confirmation = await screen.findByText(/bookmarks? to your collection/);
    expect(confirmation).toHaveTextContent("This will add 1 bookmark");
  });

  it("returns to the tabs when the confirmation is cancelled", async () => {
    setup();
    chooseJsonFile(JSON.stringify([{ title: "Keep", url: "https://example.com/one" }]));

    fireEvent.click(await screen.findByRole("button", { name: "Import" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("tab", { name: "Import JSON" })).toBeInTheDocument();
    // The staged import is fully discarded, not just hidden.
    expect(screen.getByRole("button", { name: "Import JSON Data" })).toBeDisabled();
  });
});
