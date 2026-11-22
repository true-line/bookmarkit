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

// Options modal that displays and allows changing the current LLM provider and its options
const OptionsModal = ({
  provider,
  providerOptions = {},
  onChange,
  onChangeOptions,
  encryption = { encrypted: false, locked: false },
  onEnableEncryption,
  onDisableEncryption,
  onUnlock,
  currentTheme,
  themes,
  onThemeChange,
  onThemeUpload,
  remoteFavicons = false,
  onRemoteFaviconsChange,
  effects = true,
  onEffectsChange,
  webMcpEnabled = false,
  webMcpAvailable = false,
  onWebMcpEnabledChange,
  onClose,
}) => {
  const [models, setModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [baseUrlError, setBaseUrlError] = useState("");
  const [showExample, setShowExample] = useState(false);
  const fileInputRef = useRef(null);

  const debouncedApiKey = useDebounce(providerOptions.apiKey || "", 600);
  const debouncedBaseUrl = useDebounce(providerOptions.baseUrl || "", 600);
  // A locked session reads no key value, so the clear affordance follows the
  // same visibility as the field's contents.
  const hasApiKey = Boolean(providerOptions.apiKey);

  const isValidBaseUrl = (url) => {
    if (!url) return true; // empty = use provider default, always OK
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const fetchModels = async (forceRefresh = false) => {
    // A hosted provider without a key has no request worth sending — the
    // endpoint refuses it (Gemini answers 403) — so opening Options must not
    // read as an error. Discovery waits for the key; the local servers stay
    // always ready because their listing needs none.
    if (!isProviderReady(provider, { apiKey: providerOptions.apiKey || "" })) {
      setModels([]);
      setModelsError("");
      return;
    }

    // ARCH-04: Check module-level cache before making a network request
    const cacheKey = `${provider}|${providerOptions.apiKey || ""}|${providerOptions.baseUrl || ""}`;
    if (!forceRefresh) {
      const cached = _modelsCache[cacheKey];
      if (cached && Date.now() < cached.expiresAt) {
        setModels(cached.models);
        return;
      }
    }

    setIsLoadingModels(true);
    setModelsError("");
    try {
      const opts = {
        apiKey: providerOptions.apiKey || "",
        model: providerOptions.model || "",
        baseUrl: providerOptions.baseUrl || undefined,
      };
      const llm = createLLM(provider, opts);
      const list = (await llm.listModels?.()) || [];
      const models = Array.isArray(list) ? list : [];
      // Store in module-level cache with TTL
      _modelsCache[cacheKey] = { models, expiresAt: Date.now() + MODELS_CACHE_TTL };
      setModels(models);
    } catch (e) {
      setModels([]);
      setModelsError(e?.message || "Failed to load models");
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    if (!isValidBaseUrl(debouncedBaseUrl)) {
      setBaseUrlError("Not a Valid Url Pattern");
      return;
    }
    setBaseUrlError("");
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, debouncedApiKey, debouncedBaseUrl]);

  const providerEntries = [
    { value: LLM_PROVIDERS.GEMINI, label: "Gemini" },
    { value: LLM_PROVIDERS.OPENAI, label: "OpenAI (ChatGPT)" },
    { value: LLM_PROVIDERS.GROK, label: "Grok" },
    { value: LLM_PROVIDERS.OLLAMA, label: "Ollama (Local)" },
    { value: LLM_PROVIDERS.LMSTUDIO, label: "LM Studio (Local)" },
  ];

  // Models that do not accept a temperature parameter (OpenAI o1/o3 reasoning series)
  const modelSupportsTemperature = (providerKey, modelName) => {
    if (providerKey === LLM_PROVIDERS.OPENAI && modelName) {
      return !/^o[13]/i.test(modelName);
    }
    return true;
  };

  const hosted =
    provider === LLM_PROVIDERS.GEMINI ||
    provider === LLM_PROVIDERS.OPENAI ||
    provider === LLM_PROVIDERS.GROK;
  const local = provider === LLM_PROVIDERS.OLLAMA || provider === LLM_PROVIDERS.LMSTUDIO;
  const modelChange = (e) => onChangeOptions?.({ model: e.target.value });
  const clearApiKey = () => onChangeOptions?.({ apiKey: "" });

  return (
    <>
      <Modal
        title="Options"
        closeLabel="Close options"
        onClose={onClose}
        size="2xl"
        footer={
          <>
            <Typography
              variant="body-sm"
              style={{ marginInlineEnd: "auto", alignSelf: "center", ...hintStyle }}
            >
              Changes save to this browser.
            </Typography>
            <Button onClick={onClose}>Done</Button>
          </>
        }
      >
        <div style={{ display: "grid", gap: "var(--ui-space-gutter-lg)" }}>
          {/* Read-only status: shows what provider + model will actually be
              used, as the options-settings screen's active-provider pill. */}
          <div>
            <span className="ui-pill">
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "var(--ui-radius-full)",
                  background: "var(--ui-success)",
                }}
              />
              Active: {provider || "none"}
              {providerOptions.model ? ` / ${providerOptions.model}` : ""}
            </span>
          </div>

          <section style={sectionGap} aria-labelledby="options-provider-heading">
            <div>
              <Typography
                variant="headline-sm"
                as="h3"
                id="options-provider-heading"
                style={headingStyle}
              >
                Provider &amp; model
              </Typography>
              <Typography variant="body-sm" style={sublineStyle}>
                Changes apply immediately and persist to this browser.
              </Typography>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TokenSelect
                label="LLM Provider"
                id="llm-provider"
                value={provider}
                onChange={(e) => onChange?.(e.target.value)}
                options={providerEntries}
              />
              {/* Provider-specific key field, beside the provider select as on
                  the mockup's two-column row. */}
              {hosted && (
                <ApiKeyField
                  label="API Key"
                  id="api-key"
                  placeholder={
                    encryption.locked ? "Locked — unlock below to edit" : "Enter API key"
                  }
                  value={providerOptions.apiKey || ""}
                  disabled={encryption.locked}
                  onChange={(e) => onChangeOptions?.({ apiKey: e.target.value })}
                  hasApiKey={hasApiKey}
                  onClear={clearApiKey}
                />
              )}
              {local && (
                <ApiKeyField
                  label="API Key (optional)"
                  id="local-api-key"
                  placeholder={
                    encryption.locked
                      ? "Locked — unlock below to edit"
                      : "Only if the server requires one"
                  }
                  value={providerOptions.apiKey || ""}
                  disabled={encryption.locked}
                  onChange={(e) => onChangeOptions?.({ apiKey: e.target.value })}
                  hasApiKey={hasApiKey}
                  onClear={clearApiKey}
                  hint="Neither provider needs a key. Set one only when your server sits behind an authenticating proxy; it is sent as a Bearer token."
                />
              )}
            </div>

            {hosted && (
              <>
                <ModelField
                  id="model"
                  value={providerOptions.model}
                  onChange={modelChange}
                  models={models}
                  error={modelsError}
                  loading={isLoadingModels}
                  onRefresh={() => fetchModels(true)}
                />
                {(provider === LLM_PROVIDERS.OPENAI || provider === LLM_PROVIDERS.GROK) && (
                  <div className="ui-field">
                    <InputField
                      label="Base URL (optional)"
                      id="base-url"
                      type="text"
                      dir="ltr"
                      mono
                      placeholder={
                        provider === LLM_PROVIDERS.OPENAI
                          ? "https://api.openai.com/v1"
                          : "https://api.x.ai/v1"
                      }
                      value={providerOptions.baseUrl || ""}
                      onChange={(e) => onChangeOptions?.({ baseUrl: e.target.value })}
                      error={baseUrlError || undefined}
                    />
                    {baseUrlStatus(baseUrlError)}
                  </div>
                )}
              </>
            )}
            {local && (
              <>
                <ModelField
                  id="ollama-model"
                  value={providerOptions.model}
                  onChange={modelChange}
                  models={models}
                  error={modelsError}
                  loading={isLoadingModels}
                  onRefresh={() => fetchModels(true)}
                />
                <div className="ui-field">
                  <InputField
                    label="Base URL"
                    id="ollama-url"
                    type="text"
                    dir="ltr"
                    mono
                    placeholder={
                      provider === LLM_PROVIDERS.OLLAMA
                        ? "http://localhost:11434"
                        : "http://localhost:1234"
                    }
                    value={providerOptions.baseUrl || ""}
                    onChange={(e) => onChangeOptions?.({ baseUrl: e.target.value })}
                    error={baseUrlError || undefined}
                  />
                  {baseUrlStatus(baseUrlError)}
                </div>
              </>
            )}
            {/* Temperature */}
            {(() => {
              const supportsTemp = modelSupportsTemperature(provider, providerOptions.model);
              const isEnabled = supportsTemp && !!providerOptions.enableTemperature;
              const tempValue =
                typeof providerOptions.temperature === "number" ? providerOptions.temperature : 1;
              return (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enable-temperature"
                      checked={isEnabled}
                      disabled={!supportsTemp}
                      onChange={(e) => onChangeOptions?.({ enableTemperature: e.target.checked })}
                      className="cursor-pointer disabled:cursor-not-allowed"
                      style={{ accentColor: "var(--ui-primary-container)" }}
                    />
                    <label
                      htmlFor="enable-temperature"
                      className="ui-type-label-md cursor-pointer"
                      style={{
                        color: supportsTemp
                          ? "var(--ui-on-surface)"
                          : "var(--ui-on-surface-variant)",
                      }}
                    >
                      Set temperature
                    </label>
                    {!supportsTemp && (
                      <Typography variant="body-sm" as="span" style={hintStyle}>
                        (not supported by this model)
                      </Typography>
                    )}
                    {isEnabled && (
                      <span className="ui-numeric ui-type-body-md ms-auto">
                        {tempValue.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <Typography variant="body-sm" style={{ margin: "8px 0 0", ...hintStyle }}>
                    Higher values make responses more varied. Leave off to use the provider default.
                  </Typography>
                  {isEnabled && (
                    <div className="mt-2 flex items-center gap-3">
                      <Typography variant="body-sm" as="span" style={hintStyle}>
                        0
                      </Typography>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={tempValue}
                        onChange={(e) =>
                          onChangeOptions?.({ temperature: parseFloat(e.target.value) })
                        }
                        className="flex-1"
                        style={{ accentColor: "var(--ui-primary-container)" }}
                        aria-label="Temperature value"
                      />
                      <Typography variant="body-sm" as="span" style={hintStyle}>
                        2
                      </Typography>
                    </div>
                  )}
                </div>
              );
            })()}
          </section>
          {/* #29: encryption controls — shown for every provider so a locked key
                can always be unlocked, even on providers that need no key
                (ollama/lmstudio, whose optional proxy key is protected too). */}
          <KeyEncryptionSection
            encryption={encryption}
            onEnableEncryption={onEnableEncryption}
            onDisableEncryption={onDisableEncryption}
            onUnlock={onUnlock}
          />
          {/* Theme settings */}
          <section style={sectionDivided} aria-labelledby="options-appearance-heading">
            <Typography
              variant="headline-sm"
              as="h3"
              id="options-appearance-heading"
              style={headingStyle}
            >
              Appearance
            </Typography>
            <TokenSelect
              label="Theme"
              id="theme-select"
              value={currentTheme}
              onChange={(e) => onThemeChange?.(e.target.value)}
              options={Object.keys(themes)}
              hint="Select a theme to apply."
            />
            <div className="ui-field">
              <div className="flex items-center justify-between gap-2">
                <span className="ui-type-label-md">Upload custom theme</span>
                <IconButton label="Show theme example" onClick={() => setShowExample(true)}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 115.82 1c-.44.86-1.26 1.3-1.91 1.63-.51.26-.75.52-.75.87v.5" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </IconButton>
              </div>
              <div className="flex items-center gap-3">
                {/* The mockup's Choose File row: the visible button carries the
                    picker action; the native input stays the event source so
                    re-picking the same file keeps firing change (#25). */}
                <Button intent="secondary" onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={(e) => {
                    // #25: Clear the input so re-picking the same file after a
                    // rejected theme fires another change event.
                    const [file] = e.target.files;
                    e.target.value = "";
                    if (file) onThemeUpload?.(file);
                  }}
                  style={{ display: "none" }}
                />
              </div>
              <Typography variant="body-sm" style={hintStyle}>
                Upload a JSON or YAML theme file.
              </Typography>
            </div>