// #50: The week, read back.
//
// Three sections, each of which is a list of bookmarks that can be opened from
// here, plus two ways out into work the app already does: filter to the ones
// nothing ever opened, or hand the untagged ones to the organizer (#44).
//
// It renders what it is given and decides nothing. Which bookmarks belong in each
// section is `utils/digest.js`, and the theme names either came from a model or
// from the folders the bookmarks are already in — the modal cannot tell, on purpose.
//
// Migrated to the unified design system (#248): the modal-standard shell with its
// divided header and tinted footer band, each digest section as a ui-Card with the
// weekly-digest mockup's header reading (headline-sm title over a label-sm
// bookmark count), and items in the mockup's composition — label-lg title over a
// mono-sm URL. Button intents follow the mockup's annotations: tertiary wears the
// AI-assist accent for the model-powered triage action, secondary filters to the
// never-opened set, primary closes. The digest mockup's rounded-md card radius
// loses to the spec text per the recorded divergence in DESIGN.md — the design
// system keeps its canonical radius. Digest generation is untouched — presentation
// only.

import React from "react";

import { themeItems } from "../utils/digest.js";
import { Button, Card, Modal, Typography } from "../design-system/index.js";

// The triage action's leading glyph, per the mockup's auto_awesome sparkles.
// The visible icon is aria-hidden; the button's label carries the name.
function SparkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
    </svg>
  );
}

const mutedStyle = { color: "var(--ui-on-surface-variant)" };

// One digest item, in the mockup's reading: the title is the control that
// opens the bookmark, with the URL under it in the mono type the mockup gives
// URLs — the title carries the link affordance, the URL line is a hint, so
// only the title takes the primary color.
const ItemList = ({ items, onOpen }) => (
  <ul className="mt-2 space-y-1.5">
    {items.map((bookmark) => (
      <li key={bookmark.id}>
        <button
          type="button"
          onClick={() => onOpen(bookmark)}
          title={bookmark.url}
          className="block max-w-full text-start hover:underline"
          style={{ color: "var(--ui-primary)" }}
        >
          <Typography variant="label-lg" as="span" dir="auto" className="block truncate">
            {bookmark.title || bookmark.url}
          </Typography>
          <Typography
            variant="mono-sm"
            as="span"
            dir="ltr"
            className="block truncate"
            style={mutedStyle}
          >
            {bookmark.url}
          </Typography>
        </button>
      </li>
    ))}
  </ul>
);

// One digest section as a ui-Card: the mockup's section header (headline-sm
// title, count as a tabular label-sm annotation instead of a parenthetical)
// over the section's optional hint and its items.
const SectionCard = ({ title, count, hint, children }) => (
  <Card>
    <div className="flex items-baseline justify-between gap-2">
      <Typography variant="headline-sm" as="h3">
        {title}
      </Typography>
      <Typography variant="label-sm" as="span" numeric className="shrink-0" style={mutedStyle}>
        {count} bookmark{count === 1 ? "" : "s"}
      </Typography>
    </div>
    {hint && (
      <Typography variant="body-sm" style={mutedStyle}>
        {hint}
      </Typography>
    )}
    {children}
  </Card>
);

const DigestModal = ({ digest, onOpen, onShowNeverOpened, onTriage, onClose }) => {
  const { added = [], neverOpened = [], untagged = [], themes = [] } = digest || {};

  return (
    <Modal
      title="Weekly Digest"
      description="Local summary with optional AI topic grouping."
      onClose={onClose}
      footer={
        <>
          {neverOpened.length > 0 && (
            <Button intent="secondary" onClick={onShowNeverOpened}>
              Show never opened
            </Button>
          )}
          {untagged.length > 0 && (
            <Button
              intent="tertiary"
              leadingIcon={<SparkIcon />}
              onClick={() => onTriage(untagged)}
            >
              Triage untagged
            </Button>
          )}
          <Button intent="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {added.length > 0 && (
          <SectionCard
            title="Saved this week"
            count={added.length}
            hint={themes.length > 0 ? "Grouped by theme." : undefined}
          >
            {themes.map((theme) => (
              <div key={theme.title} className="mt-2">
                <Typography variant="label-lg" as="h4">
                  {theme.title}
                </Typography>
                {theme.summary && (
                  <Typography variant="body-sm" style={mutedStyle}>
                    {theme.summary}
                  </Typography>
                )}
                <ItemList items={themeItems(theme, added)} onOpen={onOpen} />
              </div>
            ))}
          </SectionCard>
        )}

        {neverOpened.length > 0 && (
          <SectionCard
            title="Never opened"
            count={neverOpened.length}
            hint="Saved a while ago and not opened since — oldest first."
          >
            <ItemList items={neverOpened} onOpen={onOpen} />
          </SectionCard>
        )}

        {untagged.length > 0 && (
          <SectionCard
            title="Untagged"
            count={untagged.length}
            hint="Filed in a hurry. The organizer can suggest tags for these."
          >
            <ItemList items={untagged} onOpen={onOpen} />
          </SectionCard>
        )}
      </div>
    </Modal>
  );
};

export default React.memo(DigestModal);
