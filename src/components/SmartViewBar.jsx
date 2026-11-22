// #49: The row of saved views, and the one control that adds to it.
//
// A chip restores both halves of what was saved — the agent plan and the manual
// filters — because that is what the user was looking at when they saved it.
//
// #250: chips wear the pressed-state vocabulary — the active view fills with
// the primary container, the rest stay outlined — and the naming field is the
// design system's input-field (the dark on-container text swap lives in
// index.css beside the app's other chrome compositions).

import React, { useState } from "react";
import { Button, InputField } from "../design-system/index.js";

const SmartViewBar = React.memo(function SmartViewBar({
  views,
  activeViewId,
  canSave,
  onApply,
  onSave,
  onForget,
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (onSave(name)) {
      setName("");
      setNaming(false);
    }
  };

  if (views.length === 0 && !canSave) return null;

  return (
    <div className="mb-4 flex items-center gap-2 flex-wrap" role="group" aria-label="Saved views">
      {views.map((view) => {
        const active = view.id === activeViewId;
        return (
          <span key={view.id} className={`ui-view-chip ${active ? "ui-view-chip--active" : ""}`}>
            <button
              type="button"
              onClick={() => onApply(view)}
              // The chip's own state matters: pressing the active one again is a
              // no-op, and a screen reader should not have to guess that.
              aria-pressed={active}
            >
              {view.name}
            </button>
            <button
              type="button"
              onClick={() => onForget(view.id)}
              className="ui-view-chip-forget"
              aria-label={`Delete view ${view.name}`}
            >
              ✕
            </button>
          </span>
        );
      })}

      {canSave && !naming && (
        <Button intent="secondary" onClick={() => setNaming(true)}>
          Save current view
        </Button>
      )}

      {naming && (
        <form onSubmit={submit} className="flex items-center gap-2">
          <InputField
            id="smart-view-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name this view…"
            aria-label="Name for the saved view"
            wrapperClassName="w-[12.5rem]"
            autoFocus
          />
          <Button type="submit" disabled={!name.trim()}>
            Save
          </Button>
          <Button
            type="button"
            intent="secondary"
            onClick={() => {
              setNaming(false);
              setName("");
            }}
          >
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
});

export default SmartViewBar;
