import React from "react";
import { Button, InputField, Modal } from "./index.js";
import { UiScope } from "./story-decorator.jsx";

// Modal stories mirroring the spec's sticker-sheet variants: modal-standard,
// modal-alert, modal-drawer. The *Host stories render a trigger and open
// interactively; the *Open stories render the dialog directly (the repo's
// DesignSystem Dialog story convention) so the variants are visible for
// review and screenshots without a click.

const meta = {
  decorators: [UiScope],
  title: "Design System/Components/Modal",
  parameters: {
    docs: {
      description: {
        component:
          "One dialog contract for three variants: standard (role=dialog), alert (role=alertdialog, body as description), drawer (inline-start sheet whose inset, radius corners and slide are logical — flip the Direction toolbar to watch it mirror). 12px radius, spec scrim, 200ms enter and 150ms exit (immediate under prefers-reduced-motion).",
      },
    },
  },
};

export default meta;

const standardBody = (
  <div style={{ display: "grid", gap: "16px" }}>
    <InputField id="modal-title" label="Title" defaultValue="GitHub" />
    <InputField id="modal-url" label="URL" dir="ltr" defaultValue="https://github.com" />
  </div>
);

const standardFooter = (
  <>
    <Button intent="secondary">Cancel</Button>
    <Button>Save Bookmark</Button>
  </>
);

const alertBody = (
  <p style={{ margin: 0 }}>
    This removes the bookmark from your collection. Nothing outside BookmarkIt is touched, and the
    undo toast offers it back afterwards.
  </p>
);

const alertFooter = (
  <>
    <Button intent="secondary">Keep Bookmark</Button>
    <Button intent="destructive">Remove Bookmark</Button>
  </>
);

const drawerBody = (
  <div style={{ display: "grid", gap: "8px" }}>
    {["All bookmarks", "Reading list", "Work", "Research", "Archive"].map((folder) => (
      <div
        key={folder}
        style={{
          padding: "8px 12px",
          borderRadius: "var(--ui-radius)",
          background: "var(--ui-surface-container-low)",
        }}
      >
        {folder}
      </div>
    ))}
  </div>
);

function StandardHost() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Edit Bookmark</Button>
      {open && (
        <Modal
          title="Edit Bookmark"
          description="Update details, organize into folders, or generate AI suggestions."
          onClose={() => setOpen(false)}
          footer={standardFooter}
        >
          {standardBody}
        </Modal>
      )}
    </>
  );
}

export const Standard = {
  render: () => <StandardHost />,
};

export const StandardOpen = {
  render: () => (
    <Modal
      title="Edit Bookmark"
      description="Update details, organize into folders, or generate AI suggestions."
      onClose={() => {}}
      footer={standardFooter}
    >
      {standardBody}
    </Modal>
  ),
};

function AlertHost() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button intent="destructive" onClick={() => setOpen(true)}>
        Delete Bookmark
      </Button>
      {open && (
        <Modal
          variant="alert"
          title="Remove “MDN Web Docs”?"
          onClose={() => setOpen(false)}
          footer={alertFooter}
        >
          {alertBody}
        </Modal>
      )}
    </>
  );
}

export const Alert = {
  render: () => <AlertHost />,
};

export const AlertOpen = {
  render: () => (
    <Modal
      variant="alert"
      title="Remove “MDN Web Docs”?"
      description="This proposal never writes on its own; the undo toast offers it back."
      onClose={() => {}}
      footer={alertFooter}
    >
      {alertBody}
    </Modal>
  ),
};

function DrawerHost() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Folders</Button>
      {open && (
        <Modal variant="drawer" title="Folders" onClose={() => setOpen(false)}>
          {drawerBody}
        </Modal>
      )}
    </>
  );
}

export const Drawer = {
  render: () => <DrawerHost />,
};

export const DrawerOpen = {
  render: () => (
    <Modal variant="drawer" title="Folders" onClose={() => {}}>
      {drawerBody}
    </Modal>
  ),
};
