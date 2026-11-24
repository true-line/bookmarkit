// ARCH-10, #254: The empty shelf's three readings, extracted from
// BookmarkList so the virtualized list stays under its line budget.
//
// The presentation is the design system's — the manager mockup's centerpiece
// (the layered card-stack mark, headline scale for the title, body-md copy,
// the canonical button intents); the variant logic is untouched: a loading
// shelf says nothing, an emptied collection offers Add and Import, a finished
// agent action or an active search that matched nothing offers to clear.

import React from "react";
import { Button, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { AddIcon, SearchIcon, UploadIcon } from "./icons.jsx";
import EmptyStack from "./effects/EmptyStack.jsx";

function EmptyShelf({ icon, title, description, actions, compact = false }) {
  return (
    <div className={`ui-empty ${compact ? "ui-empty--compact" : ""}`}>
      {icon && <div className="ui-empty-icon">{icon}</div>}
      <div className="ui-empty-copy">
        <Typography
          variant={compact ? "headline-md" : "headline-lg"}
          as="h2"
          className="ui-empty-title"
        >
          {title}
        </Typography>
        {description && (
          <Typography variant="body-md" className="ui-empty-description">
            {description}
          </Typography>
        )}
      </div>
      {actions && <div className="ui-empty-actions">{actions}</div>}
    </div>
  );
}

const EmptyShelfStates = React.memo(function EmptyShelfStates({
  isLoading,
  bookmarksTotal,
  searchActive,
  lastAction,
  searchQuery,
  onClear,
  onAddNew,
  onImport,
  effectsEnabled = true,
}) {
  const t = useMessages();
  if (isLoading) return null;

  if (bookmarksTotal === 0) {
    return (
      <EmptyShelf
        icon={<EmptyStack enabled={effectsEnabled} />}
        title={t("emptyShelf.emptyTitle")}
        description={t("emptyShelf.emptyDescription")}
        actions={
          <>
            <Button type="button" onClick={onAddNew}>
              <AddIcon />
              {t("common.addNew")}
            </Button>
            <Button type="button" intent="secondary" onClick={onImport}>
              <UploadIcon />
              {t("common.import")}
            </Button>
          </>
        }
      />
    );
  }

  if (lastAction) {
    return (
      <EmptyShelf
        compact
        icon={<SearchIcon size={36} />}
        title={t("emptyShelf.noMatchRequest")}
        actions={
          <Button type="button" intent="secondary" onClick={onClear}>
            {t("emptyShelf.clearSearch")}
          </Button>
        }
      />
    );
  }

  if (searchActive) {
    return (
      <EmptyShelf
        compact
        icon={<SearchIcon size={36} />}
        // One literal key per variant, never a built key string.
        title={
          searchQuery
            ? t("emptyShelf.noMatchQuery", { query: searchQuery })
            : t("emptyShelf.noMatchSearch")
        }
        actions={
          <Button type="button" intent="secondary" onClick={onClear}>
            {t("emptyShelf.clearSearch")}
          </Button>
        }
      />
    );
  }

  return null;
});

export default EmptyShelfStates;
