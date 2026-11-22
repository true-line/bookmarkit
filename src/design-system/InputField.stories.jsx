import React from "react";
import { InputField } from "./InputField.jsx";
import { UiScope } from "./story-decorator.jsx";

// Input field stories mirroring the spec's sticker-sheet variants:
// input-field-text and input-field-icon. Validation never rides on color
// alone: the error state pairs the border color with an explicit message and
// aria-invalid.

const meta = {
  decorators: [UiScope],
  title: "Design System/Components/Input Field",
  parameters: {
    docs: {
      description: {
        component:
          '36px minimum height, 1px outline border (the spec\'s ≥ 3:1 boundary token), 8px radius, focus turns the border primary under the shared 2px ring. Inputs default to dir="auto" for user-entered copy; raw URL fields take dir="ltr" at the call site.',
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
      <InputField id="field-title" label="Title" defaultValue="GitHub" />
      <InputField
        id="field-url"
        label="URL"
        dir="ltr"
        defaultValue="https://github.com"
        hint="Stored as typed; never redirected silently."
      />
      <InputField
        id="field-title-error"
        label="Title"
        defaultValue=" "
        validity="invalid"
        error="Enter a title before saving."
      />
      <InputField id="field-title-disabled" label="Title" defaultValue="GitHub" disabled />
    </div>
  ),
};

export const Icon = {
  render: () => (
    <div style={{ display: "grid", gap: "16px", maxWidth: "420px" }}>
      <InputField
        id="field-search"
        label="Search bookmarks"
        icon={searchIcon}
        placeholder="Find github"
      />
      <InputField
        id="field-url-icon"
        label="URL"
        dir="ltr"
        icon={searchIcon}
        defaultValue="https://github.com"
        hint="The leading icon is decorative; the label names the field."
      />
    </div>
  ),
};
