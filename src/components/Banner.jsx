// The message banner, re-homed verbatim from the retired legacy
// DesignSystem.jsx library (#255) — the unified design system has no
// banner yet; when it grows one, this component folds into it.
import { useMessages } from "../i18n/index.js";

export default function Banner({
  tone = "info",
  title,
  children,
  onDismiss,
  className = "",
  ...props
}) {
  const t = useMessages();
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`ui-banner ui-banner--${tone} ${className}`}
      {...props}
    >
      <div className="ui-banner-content">
        {title && <p className="ui-banner-title">{title}</p>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label={t("common.dismiss")}>
          ✕
        </button>
      )}
    </div>
  );
}
