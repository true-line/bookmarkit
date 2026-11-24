import React, { useState } from "react";
import { Button, InputField, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";

// #29: passphrase encryption-at-rest controls. Rendered regardless of the
// selected provider so a locked key can always be unlocked (a provider that
// needs no key, like ollama/lmstudio, must not strand the user with no unlock
// UI — Codex #36).
//
// Migrated to the unified design system (#246): the options-settings token
// styling — a headline-sm section heading over body-sm copy, ui-InputField
// passphrase fields, the error line as the field-error text (role="alert",
// like the banner it replaces), and the canonical intents — primary commits
// the encryption action, secondary discards it. The three states and both
// flows are unchanged — presentation only.

const headingStyle = { margin: 0, color: "var(--ui-on-surface)" };
const copyStyle = { margin: 0, color: "var(--ui-on-surface-variant)" };
const fieldGap = { display: "grid", gap: "var(--ui-space-gutter-sm)" };

const KeyEncryptionSection = ({
  encryption = { encrypted: false, locked: false },
  onEnableEncryption,
  onDisableEncryption,
  onUnlock,
}) => {
  const t = useMessages();
  const [passInput, setPassInput] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [unlockInput, setUnlockInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submitEnable = async () => {
    setError("");
    if (passInput.length < 6) {
      setError(t("encryption.shortPassphrase"));
      return;
    }
    if (passInput !== passConfirm) {
      setError(t("encryption.mismatch"));
      return;
    }
    setBusy(true);
    try {
      await onEnableEncryption?.(passInput);
      setPassInput("");
      setPassConfirm("");
    } finally {
      setBusy(false);
    }
  };

  const submitUnlock = async () => {
    setError("");
    setBusy(true);
    try {
      const ok = await onUnlock?.(unlockInput);
      if (ok) setUnlockInput("");
      else setError(t("encryption.incorrect"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="options-encryption-heading"
      style={{
        ...fieldGap,
        borderTop: "1px solid var(--ui-outline-variant)",
        paddingTop: "20px",
      }}
    >
      <Typography
        variant="headline-sm"
        as="h3"
        id="options-encryption-heading"
        style={headingStyle}
      >
        {t("encryption.heading")}
      </Typography>
      {!encryption.encrypted && (
        <div style={fieldGap}>
          <Typography variant="body-sm" style={copyStyle}>
            {t("encryption.intro")}
          </Typography>
          <InputField
            label={t("encryption.passphraseLabel")}
            id="encryption-passphrase"
            type="password"
            placeholder={t("encryption.passphrasePlaceholder")}
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
          />
          <InputField
            label={t("encryption.confirmLabel")}
            id="encryption-passphrase-confirm"
            type="password"
            placeholder={t("encryption.confirmPlaceholder")}
            value={passConfirm}
            onChange={(e) => setPassConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitEnable();
            }}
          />
          {error && (
            <p className="ui-field-error" role="alert">
              {error}
            </p>
          )}
          <div>
            <Button type="button" disabled={busy} loading={busy} onClick={submitEnable}>
              {t("encryption.encrypt")}
            </Button>
          </div>
        </div>
      )}
      {encryption.encrypted && encryption.locked && (
        <div style={fieldGap}>
          <Typography variant="body-sm" style={copyStyle}>
            {t("encryption.lockedIntro")}
          </Typography>
          <InputField
            label={t("encryption.passphraseLabel")}
            id="encryption-unlock-passphrase"
            type="password"
            placeholder={t("encryption.unlockPlaceholder")}
            value={unlockInput}
            onChange={(e) => setUnlockInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitUnlock();
            }}
          />
          {error && (
            <p className="ui-field-error" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="button" disabled={busy} loading={busy} onClick={submitUnlock}>
              {t("encryption.unlock")}
            </Button>
            <Button type="button" intent="secondary" onClick={() => onDisableEncryption?.()}>
              {t("encryption.forgotPassphrase")}
            </Button>
          </div>
        </div>
      )}
      {encryption.encrypted && !encryption.locked && (
        <div style={fieldGap}>
          <Typography variant="body-sm" style={copyStyle}>
            {t("encryption.unlockedIntro")}
          </Typography>
          <div>
            <Button type="button" intent="secondary" onClick={() => onDisableEncryption?.()}>
              {t("encryption.removeEncryption")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default KeyEncryptionSection;
