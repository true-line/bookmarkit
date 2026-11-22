import React from "react";
import { Button, IconButton } from "./Button.jsx";
import { UiScope } from "./story-decorator.jsx";

// Button stories mirroring the spec's sticker-sheet variants:
// button-primary, button-icon, button-with-icon. The quiet and danger intents
// exist for dialog footers and destructive confirmations and are flagged in
// components.css as implementation additions to reconcile against the
// sticker-sheet HTML (which was missing from the archive).

const meta = {
  decorators: [UiScope],
  title: "Design System/Components/Button",
  parameters: {
    docs: {
      description: {
        component:
          "Primary (brick crimson) for local, offline actions; tertiary (unified violet) for every model-powered action so AI features read at a glance; quiet for dialog Cancels; danger for destructive confirmations. 8px radius, 36px minimum height (44px on coarse pointers), labels wrap — never fixed-width or nowrap.",
      },
    },
  },
};

export default meta;

export const Primary = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
      <Button>Add New</Button>
      <Button intent="tertiary">Suggest Tags</Button>
      <Button intent="quiet">Cancel</Button>
      <Button intent="danger">Delete</Button>
      <Button loading>Saving</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};

export const Icon = {
  render: () => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <IconButton label="Open options">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </IconButton>
      <IconButton label="Remove duplicates">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
        </svg>
      </IconButton>
      <IconButton label="Close" disabled>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </IconButton>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        component:
          "button-icon: ghost icon button. The visible icon is aria-hidden and the label prop is both the accessible name and the tooltip.",
      },
    },
  },
};

export const WithIcon = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
      <Button
        leadingIcon={
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
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        }
      >
        Import Bookmarks
      </Button>
      <Button
        intent="tertiary"
        leadingIcon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l1.9 5.7a2 2 0 001.3 1.3L21 11l-5.8 1.9a2 2 0 00-1.3 1.3L12 20l-1.9-5.8a2 2 0 00-1.3-1.3L3 11l5.8-2a2 2 0 001.3-1.3L12 2z" />
          </svg>
        }
      >
        Suggest Description
      </Button>
    </div>
  ),
};
