import React from "react";
import { InputField } from "./InputField.jsx";
import { UiScope } from "./story-decorator.jsx";

// Input field stories mirroring the screens' sticker-sheet variants:
// input-field-text, input-field-icon, and the edit-bookmark screen's
// input-field-valid. Validation never rides on color alone: the error state
// pairs the border with an explicit message and aria-invalid; the valid
// state pairs the success border and check icon with a role=status line.

const meta = {
  decorators: [UiScope],
  title: "Design System/Components/Input Field",
  parameters: {
    docs: {
      description: {
        component:
          '40px minimum height, 1px outline border (the spec\'s ≥ 3:1 boundary token), 8px radius, focus turns the border primary under the shared 2px ring. Inputs default to dir="auto" for user-entered copy; raw URL fields take dir="ltr" and mono (Fira Code) at the call site.',
      },
    },
  },
};

export default meta;

const searchIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

export const Text = {
  render: () => (
    <div style={{ display: "grid", gap: "16px", maxWidth: "420px" }}>
      <InputField id="field-title" label="Title" defaultValue="macOS Login Shells — Ghostty Help" />
      <InputField
        id="field-folder"
        label="Folder"
        defaultValue="Engineering/Terminal & CLI"
        hint="Use / for nested subfolders"
      />
      <InputField
        id="field-title-error"
        label="Title"
        validity="invalid"
        error="Enter a title before saving."
      />
      <InputField id="field-title-disabled" label="Title" defaultValue="GitHub" disabled />
    </div>
  ),
};

export const Icon = {
  render: () => (
    <div style={{ display: "grid", gap: "16px", maxWidth: "480px" }}>
      <InputField
        id="field-search"
        label="Search or filter bookmarks"
        icon={searchIcon}
        placeholder='Filter instantly or ask AI (e.g. "docs tagged cli with 4+ stars")'
      />
      <InputField
        id="field-url"
        label="URL"
        dir="ltr"
        mono
        validity="valid"
        defaultValue="https://ghostty.org/docs/help/macos-login-shells"
        success="Valid public http(s) URL"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        component:
          "input-field-icon (leading decorative icon) and the edit-bookmark screen's input-field-valid: success border, trailing check icon and a role=status line — color always paired with text.",
      },
    },
  },
};
