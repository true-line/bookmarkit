import OptionsModal from "./OptionsModal.jsx";

const noop = () => undefined;

const meta = {
  title: "BookmarkIt/Dialogs/Options",
  component: OptionsModal,
  parameters: { layout: "fullscreen" },
  args: {
    provider: "gemini",
    providerOptions: { apiKey: "", model: "gemini-2.0-flash" },
    onChange: noop,
    onChangeOptions: noop,
    onEnableEncryption: noop,
    onDisableEncryption: noop,
    onUnlock: noop,
    currentTheme: "default",
    themes: { default: {} },
    onThemeChange: noop,
    onThemeUpload: noop,
    onClose: noop,
  },
};

export default meta;

export const Default = {
  args: {
    encryption: { encrypted: false, locked: false },
  },
};

export const EncryptedAndLocked = {
  args: {
    encryption: { encrypted: true, locked: true },
  },
};

export const EncryptedAndUnlocked = {
  args: {
    encryption: { encrypted: true, locked: false },
  },
};
