import React from "react";
import { Button, Card, Typography } from "./index.js";
import { UiScope } from "./story-decorator.jsx";

// Card stories mirroring the spec's sticker-sheet variants: card-elevated,
// card-action, card-interactive, card-interactive-2. Interactive-2 is
// implemented as the selected/checked reading; see the note in Card.jsx.

const meta = {
  decorators: [UiScope],
  title: "Design System/Components/Card",
  parameters: {
    docs: {
      description: {
        component:
          "Pure white cards on the alabaster canvas: 1px outline-variant hairline, ambient shadow, 8px radius. Interactive variants raise on hover and carry the shared focus ring; the selected variant adds the primary border and a faint primary tint.",
      },
    },
  },
};

export default meta;

function CardBody() {
  return (
    <>
      <Typography variant="headline-sm">MDN Web Docs</Typography>
      <p className="ui-url" dir="ltr" style={{ margin: "4px 0 8px" }}>
        https://developer.mozilla.org/en-US/docs/Web/CSS
      </p>
      <Typography variant="body-sm">
        Resources for developers, by developers — standards, guides and references.
      </Typography>
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
            <Button intent="quiet">Edit Bookmark</Button>
            <Button>Add New</Button>
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
