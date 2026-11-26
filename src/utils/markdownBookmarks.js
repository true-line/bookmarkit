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
// the escapes the writer makes — backslash included, in both forms, which is
// what keeps the pair a true inverse rather than a lookalike.
//
// The reader is a link-list reader, not a Markdown parser, but it respects
// the constructs that would otherwise lie about the list: an image
// (`![alt](url)`) is not a bookmark, code spans and fenced blocks quote
// examples rather than recommend pages, and a destination's balanced
// parentheses are read the way CommonMark readers read them.

const LINK =
  /(?<!!)\[((?:\\.|[^\]\\\n])*)\]\(\s*(?:<((?:\\.|[^<>\\\n])*)>|((?:\\.|[^()\\\n]|\([^()\\\n]*\))*))\s*\)/gu;

// Not link material: fenced blocks and inline code spans quote their contents.
const CODE_FENCES = /```[\s\S]*?```/g;
const CODE_SPANS = /`[^`\n]*`/g;

const escapeLinkText = (title) => String(title).replace(/[\\[\]]/g, "\\$&");

// A destination is wrapped in angle brackets when it has a space or would
// close the plain form early; inside the brackets only <, > and \ are
// special. In the plain form, parentheses that balance are left readable —
// CommonMark readers (and ours) handle them — so only a stray backslash or
// an unbalanced parenthesis earns an escape.
function destinationOf(url) {
  const address = String(url);
  if (/[\s<>]/.test(address)) {
    return `<${address.replace(/[\\<>]/g, "\\$&")}>`;
  }
  if (!address.includes("\\") && balancedParens(address)) {
    return address;
  }
  return address.replace(/[\\()]/g, "\\$&");
}

// Depth never goes negative and ends at zero — the plain form's parentheses
// close the way they opened.
function balancedParens(address) {
  let depth = 0;
  for (const char of address) {
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
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
 * the caller's normalization falls back to the URL. Images, code spans and
 * fenced blocks are passed over. URL safety and entry normalization stay with
 * the caller (readImportedBookmarks), exactly as for the JSON path.
 * @param {string} text
 * @returns {Array<{title: string, url: string}>}
 */
export function parseMarkdownLinks(text) {
  const entries = [];
  const source = String(text ?? "")
    .replace(CODE_FENCES, "")
    .replace(CODE_SPANS, "");
  for (const [, linkText, pointy, plain] of source.matchAll(LINK)) {
    entries.push({
      title: unescapeMarkdown(linkText),
      url: unescapeMarkdown(pointy ?? plain ?? ""),
    });
  }
  return entries;
}
