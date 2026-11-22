import React, { useState } from "react";
import { Button, InputField, Typography } from "../design-system/index.js";

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
  const [passInput, setPassInput] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [unlockInput, setUnlockInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submitEnable = async () => {
    setError("");
    if (passInput.length < 6) {
      setError("Use a passphrase of at least 6 characters.");
      return;
    }
    if (passInput !== passConfirm) {
      setError("Passphrases don't match.");
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
      else setError("Incorrect passphrase.");
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
        API key encryption
      </Typography>
      {!encryption.encrypted && (
        <div style={fieldGap}>
          <Typography variant="body-sm" style={copyStyle}>
            Optionally encrypt your stored API key with a passphrase. You'll enter it once per
            session; if you forget it you'll need to re-enter your API key.
          </Typography>
          <InputField
            label="Passphrase"
            id="encryption-passphrase"
            type="password"
            placeholder="Passphrase (min 6 characters)"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
          />
          <InputField
            label="Confirm passphrase"
            id="encryption-passphrase-confirm"
            type="password"
            placeholder="Confirm passphrase"
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
              Encrypt API key
            </Button>
          </div>
        </div>
      )}
      {encryption.encrypted && encryption.locked && (
        <div style={fieldGap}>
          <Typography variant="body-sm" style={copyStyle}>
            🔒 Your API key is encrypted. Enter your passphrase to unlock it for this session.
          </Typography>
          <InputField
            label="Passphrase"
            id="encryption-unlock-passphrase"
            type="password"
            placeholder="Passphrase"
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
              Unlock
            </Button>
            <Button type="button" intent="secondary" onClick={() => onDisableEncryption?.()}>
              Forgot passphrase? Remove encryption
            </Button>
          </div>
        </div>
      )}
      {encryption.encrypted && !encryption.locked && (
        <div style={fieldGap}>
          <Typography variant="body-sm" style={copyStyle}>
            🔓 Your API key is encrypted (unlocked for this session).
          </Typography>
          <div>
            <Button type="button" intent="secondary" onClick={() => onDisableEncryption?.()}>
              Remove encryption
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default KeyEncryptionSection;
