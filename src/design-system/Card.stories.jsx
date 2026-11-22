import React from "react";
import { Button, Card, Tag, Typography } from "./index.js";
import { UiScope } from "./story-decorator.jsx";

// Card stories mirroring the screens' canonical composition: card-elevated,
// card-action (sticker-sheet-listed, unexercised by the screens),
// card-interactive and card-interactive-2 — the selected reading the manager
// screen confirms (2px primary border, aria-pressed rendered by the
// component). The body mirrors the bookmark card: headline-sm title, Fira Code URL, tonal
// label-sm tag chips.

const meta = {
  decorators: [UiScope],
  title: "Design System/Components/Card",
  parameters: {
    docs: {
      description: {
        component:
          "White cards on the alabaster canvas: 1px outline-variant hairline, resting shadow, 8px radius. Interactive variants raise on hover and step the border to outline; the selected variant swaps to a 2px primary border with no fill change. Cards compose — favicon tile, title, mono URL, tag chips — exactly like the manager screen's bookmark cards.",
      },
    },
  },
};

export default meta;

function CardBody() {
  return (
    <>
      <Typography variant="headline-sm" as="h2" dir="auto">
        macOS Login Shells — Ghostty Help
      </Typography>
      <p className="ui-url" dir="ltr" style={{ margin: "4px 0 8px" }}>
        https://ghostty.org/docs/help/macos-login-shells
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        <Tag>macos</Tag>
        <Tag>shell</Tag>
        <Tag>terminal</Tag>
      </div>
    </>
  );
}

export const Elevated = {
  render: () => (
    <div style={{ maxWidth: "420px" }}>
      <Card>
        <CardBody />
      </Card>
    </div>
  ),
};

export const Action = {
  render: () => (
    <div style={{ maxWidth: "420px" }}>
      <Card
        actions={
          <>
            <Button intent="secondary">Edit Bookmark</Button>
            <Button>Add Bookmark</Button>
          </>
        }
      >
        <CardBody />
      </Card>
    </div>
  ),
};

export const Interactive = {
  render: () => (
    <div style={{ maxWidth: "420px" }}>
      <Card variant="interactive" onClick={() => {}}>
        <CardBody />
      </Card>
    </div>
  ),
};

export const InteractiveSelected = {
  render: () => (
    <div style={{ maxWidth: "420px" }}>
      <Card variant="interactive-selected" onClick={() => {}}>
        <CardBody />
      </Card>
    </div>
  ),
};
