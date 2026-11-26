import { describe, it, expect } from "vitest";
import { generateMarkdownLinks, parseMarkdownLinks } from "./markdownBookmarks.js";

describe("generateMarkdownLinks", () => {
  it("writes one bullet per bookmark, in the order given", () => {
    const bookmarks = [
      { title: "MDN", url: "https://developer.mozilla.org/" },
      { title: "React docs", url: "https://react.dev/learn" },
    ];

    expect(generateMarkdownLinks(bookmarks)).toBe(
      "- [MDN](https://developer.mozilla.org/)\n- [React docs](https://react.dev/learn)\n"
    );
  });

  it("escapes the characters that would end the link text", () => {
    expect(
      generateMarkdownLinks([{ title: "Array [0] \\ exit", url: "https://example.com/" }])
    ).toBe("- [Array \\[0\\] \\\\ exit](https://example.com/)\n");
  });

  it("wraps destinations that hold spaces or delimiters in angle brackets", () => {
    expect(
      generateMarkdownLinks([
        { title: "Parens", url: "https://example.com/a(b)" },
        { title: "Spaces", url: "https://example.com/a b" },
        { title: "Bracketed", url: "https://example.com/?a=1<b" },
      ])
    ).toBe(
      "- [Parens](https://example.com/a\\(b\\))\n" +
        "- [Spaces](<https://example.com/a b>)\n" +
        "- [Bracketed](<https://example.com/?a=1\\<b>)\n"
    );
  });

  it("falls back to the URL when a bookmark has no title", () => {
    expect(generateMarkdownLinks([{ url: "https://example.com/" }])).toBe(
      "- [https://example.com/](https://example.com/)\n"
    );
  });

  it("skips entries without a URL and collapses to an empty export", () => {
    expect(generateMarkdownLinks([{ title: "No address" }])).toBe("");
    expect(generateMarkdownLinks([])).toBe("");
    expect(generateMarkdownLinks()).toBe("");
  });
});

describe("parseMarkdownLinks", () => {
  it("reads bullets with or without markers and indentation", () => {
    const text = [
      "# Reading list",
      "",
      "- [MDN](https://developer.mozilla.org/)",
      "  - [React docs](https://react.dev/learn)",
      "* [Why| Not](https://example.com/why)",
    ].join("\n");

    expect(parseMarkdownLinks(text)).toEqual([
      { title: "MDN", url: "https://developer.mozilla.org/" },
      { title: "React docs", url: "https://react.dev/learn" },
      { title: "Why| Not", url: "https://example.com/why" },
    ]);
  });

  it("reads every link on a line, not just the first", () => {
    expect(
      parseMarkdownLinks("See [a](https://a.test/) and [b](https://b.test/) for details.")
    ).toEqual([
      { title: "a", url: "https://a.test/" },
      { title: "b", url: "https://b.test/" },
    ]);
  });

  it("accepts angle-bracket destinations and undoes the escapes", () => {
    expect(
      parseMarkdownLinks(
        "- [Wiki](<https://example.com/a (b)?q=1>)\n- [Tiny](<https://x.test/\\<a\\>>)"
      )
    ).toEqual([
      { title: "Wiki", url: "https://example.com/a (b)?q=1" },
      { title: "Tiny", url: "https://x.test/<a>" },
    ]);
  });

  it("round-trips hostile titles and destinations through the writer", () => {
    const bookmark = {
      title: "[Weird] (Name) \\ exit",
      url: "https://example.com/a (b)?q=<c>&d=e(f)",
    };

    expect(parseMarkdownLinks(generateMarkdownLinks([bookmark]))).toEqual([bookmark]);
  });

  it("finds nothing in prose without links and tolerates missing input", () => {
    expect(parseMarkdownLinks("Just a sentence, no [brackets] at all.")).toEqual([]);
    expect(parseMarkdownLinks("")).toEqual([]);
    expect(parseMarkdownLinks()).toEqual([]);
  });
});
