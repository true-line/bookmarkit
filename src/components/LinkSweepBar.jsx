// #47: What the link check is doing, and what it found.
//
// Only shown when there is something to say — a sweep in progress, or broken
// links waiting to be dealt with. Dealing with them is the rest of the app's job:
// the row hands over to the "broken only" filter, and from there a selection can
// be re-tagged, edited or deleted like any other.
//
// #253: the bar speaks the unified design system — the manager band recipe the
// selection bar wears (surface-container under an outline-variant hairline),
// the status sentence on body type with tabular counts in ui-tag chips, the
// progress track/fill on the primary role, and the canonical intents: Stop on
// secondary, Show them on secondary (the ghost intent retires).

import React from "react";
import { Button, Tag } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";

const LinkSweepBar = React.memo(function LinkSweepBar({
  running,
  checked,
  total,
  brokenCount,
  brokenOnly,
  onStop,
  onShowBroken,
}) {
  const t = useMessages();
  if (!running && brokenCount === 0) return null;

  return (
    <div
      className="ui-sweep-bar mb-4 flex items-center gap-3 flex-wrap"
      role="status"
      aria-live="polite"
    >
      {running ? (
        <>
          <span className="ui-sweep-status">{t("linkSweep.checking")} </span>
          <Tag className="ui-numeric">{t("linkSweep.progress", { checked, total })}</Tag>
          <div className="ui-sweep-track">
            <div
              className="ui-sweep-fill"
              style={{ width: `${total ? Math.round((checked / total) * 100) : 0}%` }}
            />
          </div>
          <Button type="button" intent="secondary" onClick={onStop}>
            {t("common.stop")}
          </Button>
        </>
      ) : (
        <span className="ui-sweep-status">
          {/* The count wears a ui-tag chip, so it rides in the sentence as the
              `chip` slot; `count` is what picks the plural form. */}
          {t.rich("linkSweep.brokenLinks", {
            count: brokenCount,
            chip: <Tag className="ui-numeric">{t.count(brokenCount)}</Tag>,
          })}
        </span>
      )}

      {brokenCount > 0 && !brokenOnly && (
        <Button type="button" intent="secondary" onClick={onShowBroken}>
          {t("linkSweep.showBroken")}
        </Button>
      )}
    </div>
  );
});

export default LinkSweepBar;
