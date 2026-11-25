// The popup's root: the quick-add form behind the error boundary. The
// boundary is a class, so it cannot look its fallback message up itself —
// the component that mounts it can (#284). The boundary sits under
// LocaleProvider (#298) so both it and the form read the selected interface
// language, the same provider the app root mounts.
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import { LocaleProvider } from "../i18n/LocaleProvider.js";
import { useMessages } from "../i18n/index.js";
import QuickAdd from "./QuickAdd.jsx";

function QuickAddBoundary() {
  const t = useMessages();
  return (
    <ErrorBoundary fallbackMessage={t("quickAdd.errorFallback")}>
      <QuickAdd />
    </ErrorBoundary>
  );
}

export default function QuickAddRoot() {
  return (
    <LocaleProvider>
      <QuickAddBoundary />
    </LocaleProvider>
  );
}
