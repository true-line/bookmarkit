import { useEffect, useState } from "react";

// #283: from `lg` (1024px) up the app renders its navigation sidebar as a fixed
// rail (index.css, `.ui-sidebar`). The breakpoint is the stylesheet's and
// Tailwind's `lg`, exactly — this hook decides which chrome mounts (the sidebar,
// or the header's Folders toggle, the toggled pane and the saved-view row above
// the list), and the two must not disagree about where one becomes the other.
//
// Unlike useFolderSheetViewport it reads the query before the first render, so
// the first paint already has the right chrome instead of swapping it after
// mount.

const RAIL_QUERY = "(min-width: 1024px)";

/** True while the viewport shows the navigation sidebar. */
export function useSidebarViewport() {
  const [isRail, setIsRail] = useState(() =>
    typeof window.matchMedia === "function" ? window.matchMedia(RAIL_QUERY).matches : false
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(RAIL_QUERY);
    const sync = () => setIsRail(query.matches);
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

  return isRail;
}
