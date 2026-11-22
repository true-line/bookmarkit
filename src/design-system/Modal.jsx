import React from "react";
import { useFocusTrap } from "../hooks/useFocusTrap.js";

// Unified UI design system dialog (#238). Sticker-sheet variants:
// modal-standard, modal-alert, modal-drawer. The screen mockups exercise
// modal-standard only — a bordered panel with a divided header (headline-md
// title plus an optional body-sm description, both wired into the
// aria labelling) and a tinted footer band — including for destructive
// confirmations, which they run through modal-standard with a destructive
// footer button. modal-alert (alertdialog semantics) and modal-drawer stay
// as the sticker sheet's contract; the alert keeps the error-toned heading.
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

// Variant is a closed set, so tables keep the wiring decision-free.
const PANEL_CLASS = {
  standard: "ui-modal-panel",
  alert: "ui-modal-panel",
  drawer: "ui-drawer-panel",
};
const ROLE = {
  standard: "dialog",
  alert: "alertdialog",
  drawer: "dialog",
};

export function Modal({
  variant = "standard",
  title,
  description,
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
  const descriptionId = React.useId();
  const bodyId = React.useId();
  const requestClose = useDialogExitClose({ closing, setClosing, onClose, onScrimClick });

  // An alert without a description falls back to describing itself by its
  // body; standard modals only describe by an explicit description line.
  const describedBy = description ? descriptionId : variant === "alert" ? bodyId : undefined;

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
        role={ROLE[variant]}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={PANEL_CLASS[variant]}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          requestClose();
        }}
        {...props}
      >
        <ModalHeading
          title={title}
          titleId={titleId}
          description={description}
          descriptionId={descriptionId}
          closable={Boolean(onClose) && !hideClose}
          closeLabel={closeLabel}
          closeDisabled={closeDisabled}
          onClose={requestClose}
        />
        <div
          className="ui-modal-body"
          id={variant === "alert" && !description ? bodyId : undefined}
        >
          {children}
        </div>
        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// The divided header band: headline-md title over an optional body-sm
// description, with the close control at the inline end. Renders nothing
// when there is neither a title nor a close control; the ids wire the text
// into the dialog's aria labelling.
function ModalHeading({
  title,
  titleId,
  description,
  descriptionId,
  closable,
  closeLabel,
  closeDisabled,
  onClose,
}) {
  if (!title && !closable) return null;
  return (
    <div className="ui-modal-heading">
      {title && (
        <div className="text-start">
          <h2 id={titleId}>{title}</h2>
          {description && (
            <p className="ui-modal-description" id={descriptionId}>
              {description}
            </p>
          )}
        </div>
      )}
      {closable && (
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
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
  );
}

// The scrim-click guard doubles as the Escape guard, matching the
// DesignSystem Modal: a caller refusing to close mid-delete refuses both
// routes with one prop.
function useDialogExitClose({ closing, setClosing, onClose, onScrimClick }) {
  return React.useCallback(() => {
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
  }, [closing, onClose, onScrimClick, setClosing]);
}
