import React from "react";
import { useFocusTrap } from "../hooks/useFocusTrap.js";

// Unified UI design system dialog (#238). Sticker-sheet variants:
// modal-standard, modal-alert, modal-drawer.
//
// The keyboard contract is the app's existing one, reused on purpose: the
// focus trap, Escape-on-the-panel (stopped, so app shortcuts never fire
// behind the dialog and a nested dialog does not close its parent) and focus
// restoration all come from the same useFocusTrap hook the DesignSystem Modal
// uses. A dialog is a dialog regardless of which token set dresses it.
//
// The exit animation is real per the spec — 150ms with its exit cubic-bezier —
// so requestClose delays onClose by one exit duration, unless
// prefers-reduced-motion is on, in which case it closes immediately.

const EXIT_MS = 150; // mirrors --ui-duration-exit; keep in step with tokens.css

export function Modal({
  variant = "standard",
  title,
  children,
  footer = null,
  onClose,
  closeLabel = "Close",
  closeDisabled = false,
  hideClose = false,
  onScrimClick,
  className = "",
  ...props
}) {
  const panelRef = React.useRef(null);
  useFocusTrap(panelRef);
  const [closing, setClosing] = React.useState(false);
  const titleId = React.useId();
  const bodyId = React.useId();

  // The scrim-click guard doubles as the Escape guard, matching the
  // DesignSystem Modal: a caller refusing to close mid-delete refuses both
  // routes with one prop.
  const requestClose = React.useCallback(() => {
    if (closing || !onClose) return;
    if (onScrimClick) {
      onScrimClick();
      return;
    }
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }, [closing, onClose, onScrimClick]);

  const isDrawer = variant === "drawer";
  const panelClass = isDrawer ? "ui-drawer-panel" : "ui-modal-panel";

  return (
    <div
      className={`ui-modal-scrim ${className}`}
      data-closing={closing || undefined}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={panelRef}
        role={variant === "alert" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={variant === "alert" ? bodyId : undefined}
        tabIndex={-1}
        data-closing={closing || undefined}
        className={panelClass}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          requestClose();
        }}
        {...props}
      >
        {(title || (onClose && !hideClose)) && (
          <div className="ui-modal-heading">
            {title && <h2 id={titleId}>{title}</h2>}
            {onClose && !hideClose && (
              <button
                type="button"
                aria-label={closeLabel}
                onClick={requestClose}
                disabled={closeDisabled}
                className="ui-icon-button"
              >
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="ui-modal-body" id={variant === "alert" ? bodyId : undefined}>
          {children}
        </div>
        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
