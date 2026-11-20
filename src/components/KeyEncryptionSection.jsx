import React, { useState } from "react";
import { Banner, Button, Input } from "./DesignSystem.jsx";

// #29: passphrase encryption-at-rest controls. Rendered regardless of the
// selected provider so a locked key can always be unlocked (a provider that
// needs no key, like ollama/lmstudio, must not strand the user with no unlock
// UI — Codex #36).
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
    <section className="border-t border-border pt-4 space-y-3">
      <h3 className="text-lg font-semibold text-primary-text">API key encryption</h3>
      {!encryption.encrypted && (
        <div className="space-y-3">
          <p className="text-xs text-secondary-text">
            Optionally encrypt your stored API key with a passphrase. You'll enter it once per
            session; if you forget it you'll need to re-enter your API key.
          </p>
          <Input
            label="Passphrase"
            id="encryption-passphrase"
            type="password"
            placeholder="Passphrase (min 6 characters)"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
          />
          <Input
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
          {error && <Banner tone="error">{error}</Banner>}
          <Button type="button" disabled={busy} loading={busy} onClick={submitEnable}>
            Encrypt API key
          </Button>
        </div>
      )}
      {encryption.encrypted && encryption.locked && (
        <div className="space-y-3">
          <p className="text-xs text-secondary-text">
            🔒 Your API key is encrypted. Enter your passphrase to unlock it for this session.
          </p>
          <Input
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
          {error && <Banner tone="error">{error}</Banner>}
          <div className="flex items-center gap-3">
            <Button type="button" disabled={busy} loading={busy} onClick={submitUnlock}>
              Unlock
            </Button>
            <Button type="button" intent="ghost" size="sm" onClick={() => onDisableEncryption?.()}>
              Forgot passphrase? Remove encryption
            </Button>
          </div>
        </div>
      )}
      {encryption.encrypted && !encryption.locked && (
        <div className="space-y-3">
          <p className="text-xs text-secondary-text">
            🔓 Your API key is encrypted (unlocked for this session).
          </p>
          <Button type="button" intent="secondary" onClick={() => onDisableEncryption?.()}>
            Remove encryption
          </Button>
        </div>
      )}
    </section>
  );
};

export default KeyEncryptionSection;
