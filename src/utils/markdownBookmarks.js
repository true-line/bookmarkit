// The Markdown link-list format ("bookmarks.md"), in both directions. Export
// and import live together because they have to agree — the same rule the
// Netscape module states: a writer and a reader that drift apart lose data on
// the round trip. It is deliberately the mockup's "link list" (#287), not a
// document format: one bullet per bookmark as `- [Title](address)`, in the
// order given, with no folder or metadata markup — titles and addresses only,
// so any notes file or README doubles as an import source.
//
// Titles escape only the characters that would end the link text, and
// destinations choose their own quoting: a plain `(address)` when it has
// nothing to hide, CommonMark's angle-bracket form `<address>` when it
// carries spaces or delimiters. The reader accepts both and undoes exactly
// the escapes the writer makes.

const LINK = /\[((?:\\.|[^\]\\\n])*)\]\(\s*(?:<((?:\\.|[^<>\\\n])*)>|((?:\\.|[^()\\\n])*))\s*\)/gu;

const escapeLinkText = (title) => String(title).replace(/[\\[\]]/g, "\\$&");

// Plain destinations end at the first ")" and may not hold a space, so a
// destination with either goes in angle brackets; inside the brackets only
// <, > and \ need a backslash.
function destinationOf(url) {
  const address = String(url);
  if (/[\s<>]/.test(address)) {
    return `<${address.replace(/[\\<>]/g, "\\$&")}>`;
  }
  return address.replace(/[()]/g, "\\$&");
}

const unescapeMarkdown = (value) => String(value ?? "").replace(/\\(.)/g, "$1");

/**
 * Serialize bookmarks as a Markdown link list: one `- [Title](address)` bullet
 * per bookmark, in the order given, ending in a newline like the Netscape
 * writer. Entries without a URL are skipped — there is no destination to link.
 * @param {Array<object>} bookmarks
 * @returns {string}
 */
export function generateMarkdownLinks(bookmarks) {
  const lines = [];
  for (const bookmark of bookmarks || []) {
    if (!bookmark?.url) continue;
    const title = bookmark.title || bookmark.url;
    lines.push(`- [${escapeLinkText(title)}](${destinationOf(bookmark.url)})`);
  }
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

/**
 * Read every markdown link out of a document as a raw {title, url} entry —
 * escapes undone, nothing validated. Bullet markers are optional and a line
 * may hold more than one link; a title the file left empty stays empty and
 * the caller's normalization falls back to the URL. URL safety and entry
 * normalization stay with the caller (readImportedBookmarks), exactly as for
 * the JSON path.
 * @param {string} text
 * @returns {Array<{title: string, url: string}>}
 */
export function parseMarkdownLinks(text) {
  const entries = [];
  for (const [, linkText, pointy, plain] of String(text ?? "").matchAll(LINK)) {
    entries.push({
      title: unescapeMarkdown(linkText),
      url: unescapeMarkdown(pointy ?? plain ?? ""),
    });
  }
  return entries;
}
