// The popup's root: the quick-add form behind the error boundary. The
// boundary is a class, so it cannot look its fallback message up itself —
// the component that mounts it can (#284).
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import { useMessages } from "../i18n/index.js";
import QuickAdd from "./QuickAdd.jsx";

export default function QuickAddRoot() {
  const t = useMessages();
  return (
    <ErrorBoundary fallbackMessage={t("quickAdd.errorFallback")}>
      <QuickAdd />
    </ErrorBoundary>
  );
}
