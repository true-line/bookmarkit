import React from "react";

// Unified UI design system input field (#238). Sticker-sheet variants:
// input-field-text (plain) and input-field-icon (leading or trailing icon);
// the edit-bookmark screen adds input-field-valid — a success border, a
// trailing check icon and an explicit status line.
//
// The 1px outline border is the spec's ≥ 3:1 boundary token, not decoration;
// focus turns it primary under the shared 2px ring. Validation is never
// color alone: validity="invalid" pairs the error border with the `error`
// message, validity="valid" pairs the success border and check icon with the
// `success` status line (role="status").
//
// `dir="auto"` on the input itself is the spec's bidirectionality default for
// user-entered values: a Hebrew title reads RTL inside an LTR document
// without any per-locale wiring. Raw URL fields pass dir="ltr" and `mono` —
// the screens set Fira Code on URL inputs.

export const InputField = React.forwardRef(function InputField(
  {
    label,
    id,
    icon,
    trailing,
    validity = "idle",
    hint,
    error,
    success,
    mono = false,
    className = "",
    wrapperClassName = "",
    ...props
  },
  ref
) {
  const hintId = React.useId();
  const errorId = React.useId();
  const successId = React.useId();
  const invalid = validity === "invalid" || Boolean(error);
  const valid = validity === "valid" || Boolean(success);
  const status = statusLine({
    error,
    success,
    hint,
    ids: { error: errorId, success: successId, hint: hintId },
  });

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
          className={inputClassName({ valid, invalid, mono, className })}
          aria-invalid={invalid || undefined}
          aria-describedby={status?.id}
          {...props}
        />
        {trailing ?? (valid && !invalid ? <ValidCheckIcon /> : null)}
      </div>
      {status && (
        <p className={status.className} id={status.id} role={status.role}>
          {status.text}
        </p>
      )}
    </div>
  );
});

// Error, then success, then hint — one status line at a time, each carrying
// its own id so the input's aria-describedby always points at the line shown.
function statusLine({ error, success, hint, ids }) {
  if (error) {
    return { text: error, id: ids.error, className: "ui-field-error" };
  }
  if (success) {
    return { text: success, id: ids.success, className: "ui-field-success", role: "status" };
  }
  if (hint) {
    return { text: hint, id: ids.hint, className: "ui-field-hint" };
  }
  return null;
}

// The spec's 1px outline border is the base; state classes layer the success
// or error border and the URL fields' mono face on top of it.
function inputClassName({ valid, invalid, mono, className }) {
  return [
    "ui-input",
    valid ? "ui-input--valid" : "",
    invalid ? "ui-input--invalid" : "", // in case a caller styles it
    mono ? "ui-input--mono" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

// The screens' trailing check_circle on input-field-valid — decorative, so
// the status line is what assistive tech reads.
function ValidCheckIcon() {
  return (
    <span className="ui-field-icon" aria-hidden="true">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "var(--ui-success)" }}
      >
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    </span>
  );
}
