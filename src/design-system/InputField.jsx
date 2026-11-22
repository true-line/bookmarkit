import React from "react";

// Unified UI design system input field (#238). Sticker-sheet variants:
// input-field-text (plain) and input-field-icon (leading or trailing icon).
//
// The 1px outline border is the spec's ≥ 3:1 boundary token, not decoration;
// focus turns it primary under the shared 2px ring. Validation is never color
// alone: an invalid field sets aria-invalid, turns the border error-colored,
// and pairs it with an explicit message — render the icon at the call site so
// the message stays caller-owned copy.
//
// `dir="auto"` on the input itself is the spec's bidirectionality default for
// user-entered values: a Hebrew title reads RTL inside an LTR document
// without any per-locale wiring. Raw URL fields pass dir="ltr" instead.

export const InputField = React.forwardRef(function InputField(
  {
    label,
    id,
    icon = null,
    trailing = null,
    validity = "idle",
    hint,
    error,
    className = "",
    wrapperClassName = "",
    ...props
  },
  ref
) {
  const hintId = React.useId();
  const errorId = React.useId();
  const invalid = validity === "invalid" || Boolean(error);
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={`ui-field ${wrapperClassName}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="ui-field-control">
        {icon && (
          <span className="ui-field-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          dir="auto"
          className={`ui-input ${className}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {trailing && (
          <span className="ui-field-icon" aria-hidden="true">
            {trailing}
          </span>
        )}
      </div>
      {error ? (
        <p className="ui-field-error" id={errorId}>
          {error}
        </p>
      ) : hint ? (
        <p className="ui-field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});
