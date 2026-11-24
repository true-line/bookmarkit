// #49: The saved views, and the one control that adds to them.
//
// A chip restores both halves of what was saved — the agent plan and the manual
// filters — because that is what the user was looking at when it saved it.
//
// #250: chips wear the pressed-state vocabulary — the active view fills with
// the primary container, the rest stay outlined — and the naming field is the
// design system's input-field (the dark on-container text swap lives in
// index.css beside the app's other chrome compositions).
//
// #283: `layout` says where it stands. "bar" is the row above the list. "stack"
// is the navigation sidebar's column — chips wrap, the save action and the
// naming form run the rail's full width — the same chips, states and handlers
// either way.

import React, { useState } from "react";
import { Button, InputField } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";

const SmartViewBar = React.memo(function SmartViewBar({
  views,
  activeViewId,
  canSave,
  onApply,
  onSave,
  onForget,
  layout = "bar",
}) {
  const t = useMessages();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const stack = layout === "stack";

  const submit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (onSave(name)) {
      setName("");
      setNaming(false);
    }
  };

  if (views.length === 0 && !canSave) return null;

  const chips = views.map((view) => {
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
          aria-label={t("smartView.deleteView", { name: view.name })}
        >
          ✕
        </button>
      </span>
    );
  });

  return (
    <div
      className={stack ? "ui-sidebar-saved" : "mb-4 flex items-center gap-2 flex-wrap"}
      role="group"
      aria-label={t("smartView.groupLabel")}
    >
      {stack && <p className="ui-sidebar-caption">{t("smartView.savedViewsCaption")}</p>}
      {stack ? <div className="ui-sidebar-saved-chips">{chips}</div> : chips}

      {canSave && !naming && (
        <Button
          intent="secondary"
          onClick={() => setNaming(true)}
          className={stack ? "w-full" : ""}
        >
          {t("smartView.saveCurrent")}
        </Button>
      )}

      {naming && (
        <form
          onSubmit={submit}
          className={stack ? "ui-sidebar-saved-form" : "flex items-center gap-2"}
        >
          <InputField
            id="smart-view-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("smartView.namePlaceholder")}
            aria-label={t("smartView.nameAria")}
            wrapperClassName={stack ? "w-full" : "min-w-[12.5rem] max-w-full"}
            autoFocus
          />
          <div className={stack ? "ui-sidebar-saved-actions" : "flex items-center gap-2"}>
            <Button type="submit" disabled={!name.trim()}>
              {t("common.save")}
            </Button>
            <Button
              type="button"
              intent="secondary"
              onClick={() => {
                setNaming(false);
                setName("");
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
});

export default SmartViewBar;
