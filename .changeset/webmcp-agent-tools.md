---
"bookmarkit": minor
---

Browser agents can now read your bookmarks — if you say so. A new, off-by-default "Agent access" option in Options turns on two read-only WebMCP tools (`search_bookmarks` and `list_folders`) offered by the full app tab to AI agents running in the browser, for as long as that tab stays open. Agents can search the collection (title, URL, description, tags, with folder/rating filters) and list its folders, but never change, add, or fetch anything; results are capped and report how much was truncated. Requires a browser with WebMCP enabled — where it is not available, the option says so instead of toggling.
