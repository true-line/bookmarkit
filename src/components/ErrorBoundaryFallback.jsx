// The error boundary's visible fallback, in a module of its own: the boundary
// must be a class component, and a class component cannot call the hook that
// reads the message catalogue (#284).

import { Button } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";

export default function ErrorBoundaryFallback({ fallbackMessage }) {
  const t = useMessages();
  return (
    <div
      className="ui-error-fallback"
      style={{
        minHeight: "200px",
        color: "var(--text-primary, #111827)",
        backgroundColor: "var(--bg-primary, #ffffff)",
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ef4444"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginBottom: "12px" }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p style={{ fontWeight: 600, fontSize: "16px", marginBottom: "8px" }}>
        {t("errorBoundary.title")}
      </p>
      <p
        style={{
          fontSize: "14px",
          color: "var(--text-secondary, #6b7280)",
          marginBottom: "16px",
        }}
      >
        {fallbackMessage || t("errorBoundary.fallbackMessage")}
      </p>
      <Button onClick={() => window.location.reload()}>{t("errorBoundary.reload")}</Button>
    </div>
  );
}
