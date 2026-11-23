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
  if (isLoading) return null;

  if (bookmarksTotal === 0) {
    return (
      <EmptyShelf
        icon={<EmptyStack enabled={effectsEnabled} />}
        title="Your shelf is empty."
        description="Add your first bookmark, or import a browser export."
        actions={
          <>
            <Button type="button" onClick={onAddNew}>
              <AddIcon />
              Add New
            </Button>
            <Button type="button" intent="secondary" onClick={onImport}>
              <UploadIcon />
              Import
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
        title="No bookmarks match your request."
        actions={
          <Button type="button" intent="secondary" onClick={onClear}>
            Clear search
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
        title={`No bookmarks match${searchQuery ? ` "${searchQuery}"` : " your search"}.`}
        actions={
          <Button type="button" intent="secondary" onClick={onClear}>
            Clear search
          </Button>
        }
      />
    );
  }

  return null;
});

export default EmptyShelfStates;
