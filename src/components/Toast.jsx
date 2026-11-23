// The undo toast, re-homed verbatim from the retired legacy
// DesignSystem.jsx library (#255).
export default function Toast({
  label,
  actionLabel = "Undo",
  onAction,
  onDismiss,
  className = "",
}) {
  return (
    <div role="status" className={`ui-toast ${className}`}>
      <span>{label}</span>
      {onAction && (
        <button type="button" onClick={onAction} className="ui-toast-action">
          {actionLabel}
        </button>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="ui-toast-dismiss">
          ✕
        </button>
      )}
    </div>
  );
}
