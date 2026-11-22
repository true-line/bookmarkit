import React, { useMemo, useState } from "react";

import { Button, Card, Modal, Tag, Typography } from "../design-system/index.js";

// The diff a proposed change is reviewed through, on the unified design
// system (#249). The dialog's mockup family — the duplicate-review and
// bulk-edit screens — reviews through modal-standard at its wide 2xl reading:
// a divided header carrying the explainer as the body-sm description,
// proposal rows as ui-card compositions whose tags render ui-tag chips (a
// gained tag wears the screens' AI-proposed tertiary reading), raw URL
// values pinned LTR in ui-url, and a footer with the live selection count on
// the inline start beside the canonical intents — the bulk accept toggle and
// Cancel on secondary, Apply on primary. Apply stays a non-destructive
// primary: this dialog proposes and nothing writes until Apply, so the
// mockups' destructive footer reading belongs to the flows that actually
// confirm deletions (the confirm-delete dialog, #252's selection bar).
//
// The review contract itself is untouched: every row starts accepted, every
// row can be dropped on its own, and nothing is written until Apply. That
// holds whether the proposal came from a model tidying up (#44) or from an
// archive offering a copy of a dead link (#102), which is why this renders
// `utils/changeReview.js` rows and knows nothing about where they came from.
// It owns which rows are accepted and nothing else.

const FIELD_LABELS = {
  tags: "Tags",
  folderId: "Folder",
  description: "Description",
  url: "Address",
  urlStatus: "Link check",
  unreachable: "Old broken flag",
};

const WAS = { idle: "not checked", valid: "reachable", invalid: "broken", ignored: "not checked" };

const TagList = ({ tags, added = [] }) => {
  const isNew = new Set(added.map((tag) => tag.toLowerCase()));
  return (
    <span className="inline-flex flex-wrap gap-1">
      {tags.length === 0 && <span style={{ color: "var(--ui-on-surface-variant)" }}>none</span>}
      {tags.map((tag) => (
        <Tag
          key={tag}
          style={
            isNew.has(tag.toLowerCase())
              ? { background: "var(--ui-tertiary-container)", color: "var(--ui-on-tertiary)" }
              : undefined
          }
        >
          {tag}
        </Tag>
      ))}
    </span>
  );
};

// A raw value swap. Values in `mono` (addresses, folder paths) render in the
// screens' mono reading pinned LTR, so a slash path or URL never reverses in
// RTL locales; prose statuses stay in the body reading.
const Replaced = ({ from, to, mono = false }) => {
  const valueClass = mono ? "ui-url" : "";
  return (
    <span className="break-all">
      <span className={valueClass} style={{ color: "var(--ui-on-surface-variant)" }}>
        <span className="line-through">{from}</span>
      </span>{" "}
      <span aria-hidden="true">→</span>{" "}
      <span className={valueClass} style={{ color: "var(--ui-on-surface)" }}>
        {to}
      </span>
    </span>
  );
};

const FieldDiff = ({ field, before, after }) => {
  if (field === "tags") {
    const gained = (after.tags || []).filter(
      (tag) => !(before.tags || []).some((had) => had.toLowerCase() === tag.toLowerCase())
    );
    return <TagList tags={after.tags || []} added={gained} />;
  }
  if (field === "folderId") {
    return <Replaced mono from={before.folderId || "no folder"} to={after.folderId} />;
  }
  if (field === "url") return <Replaced mono from={before.url} to={after.url} />;
  if (field === "unreachable") return <Replaced from="set" to="cleared" />;
  if (field === "urlStatus") {
    return <Replaced from={WAS[before.urlStatus] ?? before.urlStatus} to={WAS[after.urlStatus]} />;
  }
  return <span style={{ color: "var(--ui-on-surface)" }}>{after.description}</span>;
};

const ChangeReviewModal = ({
  rows = [],
  title = "Review the proposed changes",
  onApply,
  onCancel,
  isApplying = false,
}) => {
  const [rejected, setRejected] = useState(() => new Set());

  const accepted = useMemo(
    () => rows.filter((row) => !rejected.has(row.id)).map((row) => row.id),
    [rows, rejected]
  );

  const toggle = (id) =>
    setRejected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allAccepted = accepted.length === rows.length;

  return (
    <Modal
      title={title}
      size="2xl"
      onClose={onCancel}
      closeDisabled={isApplying}
      closeLabel="Close without applying"
      // Instruction first: a digit-led sentence inherits the dialog's RTL
      // paragraph direction and the count visually reorders; an LTR-first
      // sentence keeps the English copy stable without pinning direction on
      // the shared description slot.
      description={`Untick anything you disagree with. ${rows.length} bookmark${
        rows.length === 1 ? "" : "s"
      } would change.`}
      onScrimClick={() => !isApplying && onCancel()}
      footer={
        <>
          <Typography
            variant="body-sm"
            numeric
            style={{
              marginInlineEnd: "auto",
              alignSelf: "center",
              color: "var(--ui-on-surface-variant)",
              // A digit-led count inherits the dialog's RTL paragraph
              // direction and the digits reorder around the words; plaintext
              // lets the count's own content set the order, per the ui-url
              // convention.
              unicodeBidi: "plaintext",
            }}
          >
            {accepted.length} of {rows.length} selected
          </Typography>
          <Button
            intent="secondary"
            onClick={() =>
              setRejected(allAccepted ? new Set(rows.map((row) => row.id)) : new Set())
            }
            disabled={isApplying}
          >
            {allAccepted ? "Deselect all" : "Select all"}
          </Button>
          <Button intent="secondary" onClick={onCancel} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            intent="primary"
            onClick={() => onApply(accepted)}
            disabled={accepted.length === 0}
            loading={isApplying}
          >
            {isApplying
              ? "Applying…"
              : `Apply ${accepted.length} change${accepted.length === 1 ? "" : "s"}`}
          </Button>
        </>
      }
    >
      <ul className="max-h-96 overflow-y-auto space-y-2">
        {rows.map((row) => (
          <li key={row.id}>
            <Card>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  style={{ accentColor: "var(--ui-primary)" }}
                  checked={!rejected.has(row.id)}
                  onChange={() => toggle(row.id)}
                  disabled={isApplying}
                />
                <span className="min-w-0">
                  <Typography variant="label-md" className="block truncate">
                    {row.title}
                  </Typography>
                  {row.fields.map((field) => (
                    <Typography key={field} variant="body-sm" as="span" className="block mt-0.5">
                      <span style={{ color: "var(--ui-on-surface-variant)" }}>
                        {FIELD_LABELS[field]}:{" "}
                      </span>
                      <FieldDiff field={field} before={row.before} after={row.after} />
                    </Typography>
                  ))}
                </span>
              </label>
            </Card>
          </li>
        ))}
      </ul>
    </Modal>
  );
};

export default React.memo(ChangeReviewModal);
