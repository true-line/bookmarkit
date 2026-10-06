import { useEffect, useState } from "react";

// #151: below Tailwind's `sm` breakpoint the folder pane renders as a
// full-width overlay sheet (see BookmarkApp). This hook is how the app knows
// that mobile presentation is active, so the sheet can behave like one: the
// content it covers is made inert, Escape closes it, and picking a folder
// dismisses it. Desktop keeps the pane as the persistent sidebar it always was.

// Just under `sm` (40rem), matching the `max-sm:` utilities on the pane.
const SHEET_QUERY = "(max-width: 639.98px)";

/** True while the viewport presents the folder pane as an overlay sheet. */
export function useFolderSheetViewport() {
  const [isSheetViewport, setIsSheetViewport] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(SHEET_QUERY);
    const sync = () => setIsSheetViewport(query.matches);
    sync();
    // Older engines only expose addListener; neither path throws on the other.
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", sync);
      return () => query.removeEventListener("change", sync);
    }
    if (typeof query.addListener === "function") {
      query.addListener(sync);
      return () => query.removeListener(sync);
    }
    return undefined;
  }, []);

  return isSheetViewport;
}
