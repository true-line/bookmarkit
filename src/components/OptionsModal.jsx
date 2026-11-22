import React, { useEffect, useRef, useState } from "react";
import { LLM_PROVIDERS, createLLM, isProviderReady } from "../llm/index.js";
import { useDebounce } from "../hooks/useDebounce.js";
import KeyEncryptionSection from "./KeyEncryptionSection.jsx";
import { Button, IconButton, InputField, Modal, Typography } from "../design-system/index.js";

// Migrated to the unified design system (#246): the options-settings screen's
// modal-standard shell at its max-w-2xl reading (size="2xl"), headline-sm
// section headings with body-sm sublines, label-md rows, and the mockup's
// component vocabulary — the native select and file controls kept and
// tokenized (ui-input — the design system ships no select primitive), the
// active-provider status pill, and the canonical button intents: primary
// exits, destructive clears the API key, tertiary drives the model-list (AI)
// action, secondary takes the discards. Provider model lists, key management
// and encryption flows are unchanged — presentation only.

// ARCH-04: Module-level cache for listModels() results, keyed by "provider|apiKey|baseUrl".
// A 5-minute TTL prevents hammering the models endpoint when the modal is repeatedly opened.
const _modelsCache = {};
const MODELS_CACHE_TTL = 5 * 60 * 1000;

// Section scaffolding shared with the help modal's reading: a 16px-row grid,
// rising to a hairline divider and a 20px inset for every section after the
// first. The subline under a heading is body-sm on the variant ink.
const sectionGap = { display: "grid", gap: "var(--ui-space-gutter-md)" };
const sectionDivided = {
  ...sectionGap,
  borderTop: "1px solid var(--ui-outline-variant)",
  paddingTop: "20px",
};
const headingStyle = { margin: 0, color: "var(--ui-on-surface)" };
const sublineStyle = { margin: "2px 0 0", color: "var(--ui-on-surface-variant)" };
const hintStyle = { margin: 0, color: "var(--ui-on-surface-variant)" };

// The design system ships no select primitive; the mockup keeps the native
// element and tokens it, so the two plain app selects (provider, theme) render
// a ui-field: label-md label over a ui-input select, with an optional hint.
function TokenSelect({ label, id, hint, options = [], ...props }) {
  const normalized = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="ui-input"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
      >
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p className="ui-field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

// The API key row carries the destructive Clear affordance beside its label —
// visible whenever a key is stored, including while the field is locked — so
// it composes ui-* primitives directly instead of routing through
// InputField's single-label contract.
function ApiKeyField({ label, id, hint, hasApiKey, onClear, ...props }) {
  return (
    <div className="ui-field">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="ui-type-label-md">
          {label}
        </label>
        {hasApiKey && (
          <Button
            type="button"
            intent="destructive"
            onClick={onClear}
            disabled={props.disabled}
            aria-label="Clear stored API key"
          >
            Clear
          </Button>
        )}
      </div>
      <input
        id={id}
        type="password"
        dir="auto"
        className="ui-input"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
      />
      {hint && (
        <p className="ui-field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

// The model row: the tertiary Refresh rides the label row (the model list is
// an AI action), and the picker is a tokenized select once the endpoint lists
// models, else a mono id input. The #224 contract is unchanged: no placeholder
// names and no phantom selection — an unset model renders as an explicit
// empty choice, and a stored model that has since disappeared stays
// selectable, because it is still the user's choice.
function ModelField({ id, value, onChange, models, error, loading, onRefresh }) {
  const listed = models && models.length > 0;
  const choices =
    listed && value && !models.includes(value) ? [value, ...models] : listed ? models : [];
  return (
    <div className="ui-field">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="ui-type-label-md">
          Model
        </label>
        <Button
          type="button"
          intent="tertiary"
          onClick={onRefresh}
          disabled={loading}
          loading={loading}
          aria-label="Refresh model list"
        >
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>
      {listed ? (
        <select
          id={id}
          className="ui-input"
          value={value || ""}
          onChange={onChange}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <option value="">Select a model…</option>
          {choices.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="text"
          dir="ltr"
          className="ui-input ui-input--mono"
          placeholder="Type a model id, or load the list"
          value={value || ""}
          onChange={onChange}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
        />
      )}
      {error ? (
        <p className="ui-field-error" role="alert" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        !listed && (
          <p className="ui-field-hint" id={`${id}-hint`}>
            The endpoint returned no models. Enter the key above (or start the local server), then
            Refresh — or type the model id.
          </p>
        )
      )}
    </div>
  );
}

// A debounced base-URL failure is an async outcome, so beside the visible
// error line it also announces politely — the legacy warning banner's role.
const baseUrlStatus = (baseUrlError) =>
  baseUrlError ? (
    <span role="status" className="sr-only">
      {baseUrlError}
    </span>
  ) : null;
