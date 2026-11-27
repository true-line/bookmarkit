// #340: the agent ask as a Spotlight-style overlay, landing #339's decision —
// the merged field is gone from the strip in every provider state, and the ask
// returns here: a bottom-centered command bar summoned with Cmd/Ctrl+K, the
// mockup's floating agent bar (`design/mockups/bookmarkit_manager/code.html`
// 493–516). Without a configured provider the shortcut answers with the
// mockup's error toast instead of a field — the #207 gate moves to press time.
//
// The dialog contract is the design system's, reused on purpose: the focus
// trap, Escape-on-the-panel (stopped, so app shortcuts never fire behind the
// overlay) and focus restoration come from the shared useFocusTrap hook, the
// scrim is the spec's, and closing defers through the 150ms exit animation the
// dialogs close through (cut under prefers-reduced-motion).
//
// Ask dismisses the overlay before the ask goes out. Spotlight is a summoner,
// not a progress pane — the answer lands in the list and the plan bar — and
// closing first keeps an error dialog from stacking its focus trap over this
// one: two live traps fighting over restore would strand focus outside the
// newer dialog.

import React, { useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import { useMessages } from "../i18n/index.js";
import { Button } from "../design-system/index.js";
import { CloseIcon, ErrorIcon, SparkIcon } from "./icons.jsx";

const EXIT_MS = 150; // mirrors --ui-duration-exit; keep in step with tokens.css

// The deferred exit is the Modal's, kept one decision: reduced motion closes
// immediately, everything else waits out the exit animation.
function useExitClose({ closing, setClosing, onClose }) {
  return React.useCallback(() => {
    if (closing || !onClose) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }, [closing, onClose, setClosing]);
}

// The overlay itself: the scrim takes the dismiss click, and the trapped
// panel is a named role="dialog" with aria-modal="true" — assistive tech is
// told a modal context opened, like every other trapped overlay — around the
// mockup's form, which stays role="search" with its accessible name: the
// sr-only label over a dir="auto" input, the kbd chip and the tertiary Ask.
function SpotlightOverlay({ onClose, onSubmit }) {
  const t = useMessages();
  const [query, setQuery] = useState("");
  const [closing, setClosing] = useState(false);
  const panelRef = React.useRef(null);
  useFocusTrap(panelRef);
  const requestClose = useExitClose({ closing, setClosing, onClose });

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setQuery("");
    onSubmit(trimmed);
  };

  return (
    <div
      className="ui-spotlight-scrim"
      data-closing={closing || undefined}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={t("agentBar.label")}>
        <form
          role="search"
          aria-label={t("agentBar.label")}
          className="ui-spotlight-panel"
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            requestClose();
          }}
          onSubmit={handleSubmit}
        >
          <span className="ui-spotlight-chip" aria-hidden="true">
            <SparkIcon size={18} />
          </span>
          <label htmlFor="agent-spotlight-input" className="sr-only">
            {t("agentBar.askLabel")}
          </label>
          <input
            id="agent-spotlight-input"
            type="text"
            dir="auto"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("agentBar.placeholder")}
            className="ui-spotlight-input"
            autoComplete="off"
          />
          <kbd dir="ltr" className="ui-kbd ui-spotlight-kbd">
            {t("agentBar.kbd")}
          </kbd>
          <Button type="submit" intent="tertiary" disabled={!query.trim()}>
            {t("agentBar.ask")}
          </Button>
        </form>
      </div>
    </div>
  );
}

// The gate toast: role="alert" is assertive by definition and spelled out
// beside it, the mockup's error reading. It answers the shortcut instead of
// the field, so it lives until the user dismisses it or configures a provider.
function ProviderGateToast({ onDismiss }) {
  const t = useMessages();
  return (
    <div className="ui-spotlight-toast-dock">
      <div className="ui-spotlight-toast" role="alert" aria-live="assertive">
        <span className="ui-spotlight-toast-icon" aria-hidden="true">
          <ErrorIcon />
        </span>
        <span className="ui-spotlight-toast-text">{t("agentBar.gate")}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("agentBar.dismissNotice")}
          className="ui-spotlight-toast-dismiss"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * The agent bar and its gate, mounted at the shell's root beside the dialogs —
 * no ancestor's transform may re-anchor the fixed overlay, the way the
 * selection bar stays clear of the sliding header.
 *
 * Exactly one of `open` and `noticeOpen` is set by the caller: the shortcut
 * opens the bar when a provider is configured and answers with the toast when
 * not, and opening the bar clears a stale notice.
 *
 * @param {boolean} props.open The overlay is up (mounts the trapped panel).
 * @param {boolean} props.noticeOpen The gate toast is up (no provider).
 * @param {() => void} props.onClose Escape or scrim dismissed the overlay.
 * @param {() => void} props.onDismissNotice The toast's dismiss button.
 * @param {(query: string) => void} props.onSubmit Ask, with the trimmed query;
 *   the caller runs the plan and closes the overlay.
 */
const AgentSpotlightBar = ({ open, noticeOpen, onClose, onDismissNotice, onSubmit }) => {
  if (!open && !noticeOpen) return null;
  return (
    <>
      {noticeOpen && <ProviderGateToast onDismiss={onDismissNotice} />}
      {open && <SpotlightOverlay onClose={onClose} onSubmit={onSubmit} />}
    </>
  );
};

export default AgentSpotlightBar;
