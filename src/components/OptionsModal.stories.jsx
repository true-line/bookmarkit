import OptionsModal from "./OptionsModal.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The options modal is migrated to the unified design system (#246), so its
// stories render under the same [data-ui-theme] scope root the app gets from
// the theme bridge. Flip the UI theme and Direction toolbars for the light,
// dark and RTL checks; the mockup screen is desktop-first, so the panel keeps
// its wide 2xl reading and stacks its two-column rows on narrow viewports.

const noop = () => undefined;

const meta = {
  title: "BookmarkIt/Dialogs/Options",
  component: OptionsModal,
  decorators: [UiScope],
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
    remoteFavicons: false,
    onRemoteFaviconsChange: noop,
    effects: true,
    onEffectsChange: noop,
    webMcpEnabled: false,
    webMcpAvailable: true,
    onWebMcpEnabledChange: noop,
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

export const AgentAccessUnavailable = {
  args: {
    encryption: { encrypted: false, locked: false },
    webMcpAvailable: false,
  },
};
