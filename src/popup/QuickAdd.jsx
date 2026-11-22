// #51: Toolbar popup — bookmark the current tab without opening the full app.
// Goes through the same store factory and the same useBookmarkStore hook as the main
// app, so the popup and the app can never drift into two different write paths.
//
// Migrated to the unified design system (#245): the quick-add mockup's compact
// shell — brand-mark header, labeled fields, folder/tags grid, divided footer
// pairing the tonal "Open BookmarkIt" with the crimson "Save Bookmark". The
// mockup renders a desktop frame, so its spacing is adapted to the real 22rem
// viewport rather than copied wholesale, and the pieces the save flow needs
// that the mockup leaves out stay: the rating editor (no unified counterpart
// yet) and the already-saved tag. Escape remains the cancel affordance.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBookmarkStore } from "../hooks/useBookmarkStore.js";
import { useTheme } from "../hooks/useTheme.js";
import { isSafeHttpUrl } from "../utils/url.js";
import { Button, InputField, Tag } from "../design-system/index.js";
import { StarRating } from "../components/DesignSystem.jsx";

function QuickAddFields({ form, setForm, folderOptions }) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <>
      <InputField
        id="qa-title"
        label="Title"
        type="text"
        value={form.title}
        onChange={set("title")}
        autoFocus
      />

      {/* Raw URL values read in Fira Code and never reverse in RTL locales —
          the screens set dir="ltr" on URL inputs. */}
      <InputField
        id="qa-url"
        label="URL"
        type="url"
        value={form.url}
        onChange={set("url")}
        placeholder="https://…"
        mono
        dir="ltr"
      />

      <div className="grid grid-cols-2 gap-2">
        <InputField
          id="qa-folder"
          label="Folder"
          type="text"
          value={form.folderId}
          onChange={set("folderId")}
          placeholder="Folder (e.g. Work/API)"
          list="qa-folders"
        />
        {/* Cheap folder autocomplete against paths already in use — typing a folder
            path blind is how you end up with both "work" and "Work". */}
        <datalist id="qa-folders">
          {folderOptions.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <InputField
          id="qa-tags"
          label="Tags"
          type="text"
          value={form.tags}
          onChange={set("tags")}
          placeholder="tags, comma, separated"
        />
      </div>
    </>
  );
}

// The mockup's compact header: the brand mark on the ribbon red beside the
// screen title. The glyph is the brand mark itself — its white stays white in
// dark, and the square reads --ui-brand-crimson, which the theme bridge maps
// onto the user's accent.
function PopupHeader({ existing }) {
  return (
    <header
      className="flex items-center justify-between gap-2 pb-3"
      style={{ borderBottom: "1px solid var(--ui-outline-variant)" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-7 h-7 rounded flex items-center justify-center shrink-0"
          style={{ background: "var(--ui-brand-crimson)", color: "#fff" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z" />
          </svg>
        </div>
        <h1 className="ui-type-headline-sm truncate" style={{ color: "var(--ui-on-surface)" }}>
          Quick Add
        </h1>
      </div>
      {existing && <Tag>Already saved</Tag>}
    </header>
  );
}

// The mockup's non-http(s) fallback state: an info box on the container
// surface, then the full-width primary way out.
function PopupError({ message, onOpenApp }) {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div
        className="flex items-start gap-2.5 p-3 rounded"
        style={{
          background: "var(--ui-surface-container)",
          border: "1px solid var(--ui-outline-variant)",
        }}
      >
        <span className="shrink-0 mt-0.5" style={{ color: "var(--ui-on-surface-variant)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </span>
        <p className="ui-type-body-md m-0" style={{ color: "var(--ui-on-surface-variant)" }}>
          {message}
        </p>
      </div>
      <Button intent="primary" className="w-full" onClick={onOpenApp}>
        Open BookmarkIt
      </Button>
    </div>
  );
}

function PopupLoading() {
  return (
    <div className="p-6 flex items-center justify-center">
      <span className="ui-spinner" role="status" aria-label="Loading" />
    </div>
  );
}

// The loaded form: the mockup's field stack, then the divided footer pairing
// the tonal way out with the crimson save. The rating editor sits between the
// fields and the footer — the mockup omits it, but the save flow writes it.
function QuickAddBody({ form, setForm, folderOptions, existing, status, onSave, onOpenApp }) {
  const saving = status.state === "saving";
  const saved = status.state === "saved";

  return (
    <>
      <div className="flex flex-col gap-3.5">
        <QuickAddFields form={form} setForm={setForm} folderOptions={folderOptions} />
        <div>
          <StarRating
            value={form.rating}
            onChange={(rating) => setForm((f) => ({ ...f, rating }))}
            buttonSemantics
          />
        </div>
      </div>

      {status.state === "error" && (
        <p className="ui-field-error m-0" role="alert">
          {status.message}
        </p>
      )}

      <footer
        className="flex items-center justify-between gap-2 pt-2"
        style={{ borderTop: "1px solid var(--ui-outline-variant)" }}
      >
        <Button intent="secondary" onClick={onOpenApp}>
          Open BookmarkIt
        </Button>
        <Button intent="primary" onClick={onSave} disabled={saving || saved} loading={saving}>
          {saving
            ? "Saving…"
            : saved
              ? `✓ ${status.message}`
              : existing
                ? "Update Bookmark"
                : "Save Bookmark"}
        </Button>
      </footer>

      <p
        className="ui-type-label-sm text-center m-0"
        style={{ color: "var(--ui-on-surface-variant)" }}
        aria-hidden="true"
      >
        Enter to save · Esc to close
      </p>
    </>
  );
}
