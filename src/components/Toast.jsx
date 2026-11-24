// The undo toast, re-homed from the retired legacy DesignSystem.jsx library
// (#255); its two defaults come from the message catalogue (#284).
import { useMessages } from "../i18n/index.js";

export default function Toast({ label, actionLabel, onAction, onDismiss, className = "" }) {
  const t = useMessages();
  return (
    <div role="status" className={`ui-toast ${className}`}>
      <span>{label}</span>
      {onAction && (
        <button type="button" onClick={onAction} className="ui-toast-action">
          {actionLabel ?? t("common.undo")}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("common.dismiss")}
          className="ui-toast-dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
