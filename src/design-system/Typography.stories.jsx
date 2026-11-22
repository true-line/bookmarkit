import React from "react";
import { Typography } from "./Typography.jsx";
import { UiScope } from "./story-decorator.jsx";

// Typography stories mirroring the spec's sticker-sheet variants:
// typography-display, typography-body, typography-label. The full scale with
// token names lives in Foundations/TypeScale; these stories show the three
// sticker-sheet groupings the way a page would use them.

const meta = {
  decorators: [UiScope],
  title: "Design System/Components/Typography",
  parameters: {
    docs: {
      description: {
        component:
          "Red Hat Text for headings, Radio Canada Big for UI and body, Fira Code for URLs, shortcut chips and provider pills. numeric renders tabular figures for counts and timestamps; raw URLs render with .ui-url (dir=ltr, unicode-bidi: plaintext) so RTL locales never reverse them.",
      },
    },
  },
};

export default meta;

export const Display = {
  render: () => (
    <div style={{ display: "grid", gap: "16px" }}>
      <Typography variant="display-lg">Every bookmark, exactly where you left it</Typography>
      <Typography variant="headline-lg">Collections and folders</Typography>
      <Typography variant="headline-md">Add New Bookmark</Typography>
      <Typography variant="headline-sm">MDN Web Docs</Typography>
    </div>
  ),
};

export const Body = {
  render: () => (
    <div style={{ display: "grid", gap: "12px", maxWidth: "560px" }}>
      <Typography variant="body-lg">
        Body large for primary reading: the digest intro, the empty-state explainer.
      </Typography>
      <Typography variant="body-md">
        Body medium is the default: card descriptions, dialog copy, helper text. Sentence case for
        helper text and privacy notices; Title Case for headings and primary actions.
      </Typography>
      <Typography variant="body-sm">
        Body small for hints, metadata and quiet explanations — never below 12px.
      </Typography>
    </div>
  ),
};

export const Label = {
  render: () => (
    <div style={{ display: "grid", gap: "12px", alignItems: "center" }}>
      <Typography variant="label-lg">Label large — primary button copy</Typography>
      <Typography variant="label-md">Label medium — form labels and segmented controls</Typography>
      <Typography variant="label-sm">Label small — dense chips</Typography>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <kbd className="ui-kbd">Shift</kbd>
        <span>+</span>
        <kbd className="ui-kbd">E</kbd>
        <span style={{ marginInlineStart: "12px" }} />
        <span className="ui-pill">openai · gpt-4o-mini</span>
        <span className="ui-pill ui-numeric">128 bookmarks</span>
      </div>
      <Typography variant="mono-md" numeric>
        https://github.com — Fira Code, tabular figures
      </Typography>
    </div>
  ),
};
