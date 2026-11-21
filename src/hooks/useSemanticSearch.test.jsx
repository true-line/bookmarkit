import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";

const embedTexts = vi.fn();

vi.mock("../llm/embeddings.js", async (importOriginal) => ({
  ...(await importOriginal()),
  embedTexts,
}));

const { useSemanticSearch } = await import("./useSemanticSearch.js");
const { contentHash, embeddingText } = await import("../utils/semanticSearch.js");

const INDEX_KEY = "bookmarkit.semanticIndex";

const bookmark = (id, over = {}) => ({
  id,
  title: `Title ${id}`,
  description: "",
  tags: [],
  url: `https://example.com/${id}`,
  folderId: "",
  ...over,
});

let semantic;

const Probe = (props) => {
  semantic = useSemanticSearch(props);
  return <span>{semantic.indexing ? "indexing" : "idle"}</span>;
};

const setup = (props = {}) =>
  render(<Probe provider="openai" providerOptions={{ apiKey: "k" }} locked={false} {...props} />);

/** A vector pointing at whichever axis this id should sit on. */
const axis = (n) => [n === 0 ? 1 : 0, n === 1 ? 1 : 0];

beforeEach(() => {
  embedTexts.mockReset();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("useSemanticSearch (#46)", () => {
  it("embeds the collection, then ranks the query against it", async () => {
    const list = [bookmark("0"), bookmark("1")];
    embedTexts
      .mockResolvedValueOnce([axis(0), axis(1)]) // the collection
      .mockResolvedValueOnce([axis(1)]); // the query
    setup();

    let ids;
    await act(async () => {
      ids = await semantic.search("something like title 1", list);
    });

    expect(ids).toEqual(["1"]);
  });

  it("remembers vectors, so a second search only embeds the query", async () => {
    const list = [bookmark("0")];
    embedTexts.mockResolvedValue([axis(0)]);
    setup();

    await act(async () => {
      await semantic.search("first", list);
    });
    const afterFirst = embedTexts.mock.calls.length;
    await act(async () => {
      await semantic.search("second", list);
    });

    // The collection was embedded once; each search embeds its own query.
    expect(embedTexts.mock.calls.length).toBe(afterFirst + 1);
    expect(JSON.parse(localStorage.getItem(INDEX_KEY))["0"].hash).toBe(
      contentHash(embeddingText(list[0]))
    );
  });

  it("re-embeds a bookmark whose text changed", async () => {
    const before = bookmark("0");
    embedTexts.mockResolvedValue([axis(0)]);
    setup();

    await act(async () => {
      await semantic.search("q", [before]);
    });
    embedTexts.mockClear();
    await act(async () => {
      await semantic.search("q", [{ ...before, title: "A different title entirely" }]);
    });

    // Once for the changed bookmark, once for the query.
    expect(embedTexts).toHaveBeenCalledTimes(2);
  });

  it("forgets a bookmark that is gone", async () => {
    embedTexts.mockResolvedValue([axis(0)]);
    setup();

    await act(async () => {
      await semantic.search("q", [bookmark("0")]);
    });
    embedTexts.mockResolvedValue([axis(1)]);
    await act(async () => {
      await semantic.search("q", [bookmark("1")]);
    });

    expect(Object.keys(JSON.parse(localStorage.getItem(INDEX_KEY)))).toEqual(["1"]);
  });

  it("says nothing rather than failing when the provider does", async () => {
    embedTexts.mockRejectedValue(new Error("429 slow down"));
    setup();

    let ids;
    await act(async () => {
      ids = await semantic.search("q", [bookmark("0")]);
    });

    expect(ids).toEqual([]);
  });

  it("asks nothing of a provider with no embeddings endpoint", async () => {
    setup({ provider: "grok" });

    let ids;
    await act(async () => {
      ids = await semantic.search("q", [bookmark("0")]);
    });

    expect(ids).toEqual([]);
    expect(embedTexts).not.toHaveBeenCalled();
  });

  // A provider name is not consent, and searching sends the query out.
  it("asks nothing without a usable key, or while one is locked", async () => {
    setup({ providerOptions: {} });
    await act(async () => {
      await semantic.search("q", [bookmark("0")]);
    });
    expect(embedTexts).not.toHaveBeenCalled();

    setup({ locked: true });
    await act(async () => {
      await semantic.search("q", [bookmark("0")]);
    });
    expect(embedTexts).not.toHaveBeenCalled();
  });

  it("has nothing to search for when the query is blank", async () => {
    setup();

    await act(async () => {
      await semantic.search("   ", [bookmark("0")]);
    });

    expect(embedTexts).not.toHaveBeenCalled();
  });

  // Codex-review P1: with the search box unlocked, a second query can arrive
  // while the first is still rebuilding the index. The rebuilds serialize —
  // the second waits for the first to commit and then re-checks what is still
  // missing — so the collection is never embedded twice.
  it("re-embeds the collection once for concurrent searches", async () => {
    const list = [bookmark("0"), bookmark("1")];
    let releaseCollection;
    let collectionStarted;
    const started = new Promise((resolve) => {
      collectionStarted = resolve;
    });
    embedTexts
      .mockImplementationOnce(() => {
        collectionStarted();
        return new Promise((resolve) => {
          releaseCollection = resolve;
        });
      })
      .mockResolvedValue([axis(0)]);
    setup();

    await act(async () => {
      const first = semantic.search("first", list);
      const second = semantic.search("second", list);
      await started; // the first rebuild is now mid-embed
      releaseCollection([axis(0), axis(1)]);
      await Promise.all([first, second]);
    });

    // One collection batch (both bookmarks), one query vector per search.
    expect(embedTexts.mock.calls.filter((call) => call[2].length === 2)).toHaveLength(1);
    expect(embedTexts).toHaveBeenCalledTimes(3);
  });

  it("commits a mid-rebuild snapshot's fresh text over the older one", async () => {
    const original = bookmark("0");
    const edited = { ...original, title: "A different title entirely" };
    let releaseFirst;
    let firstStarted;
    const started = new Promise((resolve) => {
      firstStarted = resolve;
    });
    embedTexts
      .mockImplementationOnce(() => {
        firstStarted();
        return new Promise((resolve) => {
          releaseFirst = resolve;
        });
      })
      .mockResolvedValue([axis(0)]);
    setup();

    await act(async () => {
      const first = semantic.search("q", [original]); // slow refresh, old text
      const second = semantic.search("q", [edited]); // arrives mid-rebuild
      await started;
      releaseFirst([axis(0)]);
      await Promise.all([first, second]);
    });

    // The second search waited out the first rebuild, saw the stored hash no
    // longer matched the edited text, and earned its own vector for it.
    expect(embedTexts.mock.calls.map((call) => call[2])).toEqual([
      [embeddingText(original)],
      ["q"],
      [embeddingText(edited)],
      ["q"],
    ]);
    expect(JSON.parse(localStorage.getItem(INDEX_KEY))["0"].hash).toBe(
      contentHash(embeddingText(edited))
    );
  });
});
