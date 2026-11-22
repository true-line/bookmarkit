import React from "react";
import { Button, IconButton } from "./Button.jsx";
import { UiScope } from "./story-decorator.jsx";

// Button stories mirroring the screen mockups' canonical vocabulary:
// button-primary, button-secondary, button-tertiary, button-destructive,
// button-icon, button-with-icon. Filled buttons rest on the container role
// and step to the base role on hover (primary-container → primary,
// tertiary-container → tertiary).

const meta = {
  decorators: [UiScope],
  title: "Design System/Components/Button",
  parameters: {
    docs: {
      description: {
        component:
          "Primary (brick-crimson container fill) for local, offline actions; tertiary (unified violet container fill, label-md) for every model-powered action so AI features read at a glance; secondary — the tonal bordered Cancel in dialog footers; outlined — the white bordered reading of button-with-icon; destructive for delete confirmations. 8px radius, 36px minimum height (44px on coarse pointers), labels wrap — never fixed-width or nowrap.",
      },
    },
  },
};

export default meta;

export const Primary = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
      <Button>Add Bookmark</Button>
      <Button intent="tertiary">Suggest</Button>
      <Button intent="secondary">Cancel</Button>
      <Button intent="outlined">Asc</Button>
      <Button intent="destructive">Delete</Button>
      <Button loading>Saving</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};

export const Icon = {
  render: () => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <IconButton label="Help and keyboard shortcuts">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
        </svg>
      </IconButton>
      <IconButton label="Remove duplicates">
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
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
        </svg>
      </IconButton>
      <IconButton label="Close dialog" disabled>
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
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </IconButton>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        component:
          "button-icon: tonal bordered icon button (surface-container fill, outline-variant hairline). The visible icon is aria-hidden and the label prop is both the accessible name and the tooltip.",
      },
    },
  },
};

export const WithIcon = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
      <Button
        intent="outlined"
        leadingIcon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        }
      >
        Asc
      </Button>
      <Button
        intent="tertiary"
        leadingIcon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l1.9 5.7a2 2 0 001.3 1.3L21 11l-5.8 1.9a2 2 0 00-1.3 1.3L12 20l-1.9-5.8a2 2 0 00-1.3-1.3L3 11l5.8-2a2 2 0 001.3-1.3L12 2z" />
          </svg>
        }
      >
        Suggest Description
      </Button>
      <Button
        intent="destructive"
        leadingIcon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
          </svg>
        }
      >
        Delete
      </Button>
    </div>
  ),
};
