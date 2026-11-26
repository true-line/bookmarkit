import React, { useMemo, useState } from "react";

import { Button, Card, Modal, Tag, Typography } from "../design-system/index.js";
import { keepReasonTokens } from "../utils/duplicates.js";
import { useMessages } from "../i18n/index.js";
import { SparkIcon } from "./icons.jsx";

// The duplicate review (#285), on the review-dialog pattern the organizer
// (#44) and archive recovery (#102) already use: every pair starts selected,
// any pair can be dropped on its own, and nothing is written until Remove.
// The difference is what a row is — here it is a *pair*, both copies side by
// side per the mockup, the survivor wearing the reason it survived (the
// metadata that carried the keep decision) and the row wearing a provenance
// chip: the deterministic rule against the model's second opinion. The rule
// row's headline is a token resolved through the table below at render time —
// one literal key per known value, never a built key string; an AI row's
// headline is the model's own phrase, which is why the pair is on screen.
//
// Unlike the change review this dialog's Apply deletes, so its footer takes
// the mockups' destructive reading — the same recipe the confirm-delete
// dialog uses — and Remove is disabled until a pair is selected. The rows
// arrive as {id, keep, drop, source: "rule"|"ai", headline}, where a rule
// row's headline is "exactUrl" | "sameTitle" and an AI row's headline is the
// model phrase; `id` is the copy that would go, and it is what onRemove
// receives for every pair left ticked.

const HEADLINE_KEYS = {
  exactUrl: "duplicateReview.exactUrlMatch",
  sameTitle: "duplicateReview.sameTitle",
};

// keepReasonTokens' display tokens, resolved against the catalogue the same
// way — the joined words land in keepBadge's {reason} slot.
const KEEP_TOKEN_KEYS = {
  tags: "duplicateReview.keepTags",
  rating: "duplicateReview.keepRating",
  notes: "duplicateReview.keepNotes",
  earliest: "duplicateReview.keepEarliest",
};

const labelOf = (bookmark) => bookmark?.title || bookmark?.url || "";

const CopyTile = ({ copy, badge, badgeStyle, borderStyle }) => (
  <div className="rounded p-3 min-w-0" style={{ border: borderStyle }}>
    <Typography variant="label-sm" as="span" className="block mb-1" style={badgeStyle}>
      {badge}
    </Typography>
    <Typography variant="label-md" className="block truncate">
      {labelOf(copy)}
    </Typography>
    {copy?.url && (
      <p className="ui-url truncate mt-0.5" style={{ color: "var(--ui-on-surface-variant)" }}>
        {copy.url}
      </p>
    )}
  </div>
);

const DuplicateReviewModal = ({ pairs = [], onRemove, onCancel, isRemoving = false }) => {
  const t = useMessages();
  const [rejected, setRejected] = useState(() => new Set());

  const selected = useMemo(
    () => pairs.filter((pair) => !rejected.has(pair.id)).map((pair) => pair.id),
    [pairs, rejected]
  );

  const toggle = (id) =>
    setRejected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = selected.length === pairs.length;

  return (
    <Modal
      title={t("duplicateReview.title")}
      size="2xl"
      onClose={onCancel}
      closeDisabled={isRemoving}
      closeLabel={t("duplicateReview.closeWithoutRemoving")}
      // Same bidi reasoning as the change review's description: the count
      // leads in some translations, so the sentence keeps the dialog's
      // paragraph direction rather than reordering around the digits.
      description={t("duplicateReview.description", { count: pairs.length })}
      onScrimClick={() => !isRemoving && onCancel()}
      footer={
        <>
          <Typography
            variant="body-sm"
            numeric
            style={{
              marginInlineEnd: "auto",
              alignSelf: "center",
              color: "var(--ui-on-surface-variant)",
              unicodeBidi: "plaintext",
            }}
          >
            {t("duplicateReview.selectionCount", {
              selected: selected.length,
              total: pairs.length,
            })}
          </Typography>
          <Button
            intent="secondary"
            onClick={() =>
              setRejected(allSelected ? new Set(pairs.map((pair) => pair.id)) : new Set())
            }
            disabled={isRemoving}
          >
            {allSelected ? t("duplicateReview.deselectAll") : t("duplicateReview.selectAll")}
          </Button>
          <Button intent="secondary" onClick={onCancel} disabled={isRemoving}>
            {t("common.cancel")}
          </Button>
          <Button
            intent="destructive"
            onClick={() => onRemove(selected)}
            disabled={selected.length === 0}
            loading={isRemoving}
          >
            {isRemoving
              ? t("duplicateReview.removing")
              : t("duplicateReview.removeSelected", { count: selected.length })}
          </Button>
        </>
      }
    >
      <ul className="max-h-96 overflow-y-auto space-y-2">
        {pairs.map((pair) => {
          const keepReason = keepReasonTokens(pair.keep)
            .map((token) => t(KEEP_TOKEN_KEYS[token]))
            .join(" & ");
          return (
            <li key={pair.id}>
              <Card>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        style={{ accentColor: "var(--ui-primary)" }}
                        aria-label={t("duplicateReview.rowToggle", {
                          remove: labelOf(pair.drop),
                          keep: labelOf(pair.keep),
                        })}
                        checked={!rejected.has(pair.id)}
                        onChange={() => toggle(pair.id)}
                        disabled={isRemoving}
                      />
                      <Typography variant="label-md" className="truncate">
                        {pair.source === "ai"
                          ? pair.headline
                          : HEADLINE_KEYS[pair.headline]
                            ? t(HEADLINE_KEYS[pair.headline])
                            : ""}
                      </Typography>
                    </label>
                    {pair.source === "ai" ? (
                      <Tag className="ui-tag--accent gap-1">
                        <SparkIcon size={13} />
                        {t("duplicateReview.sourceAi")}
                      </Tag>
                    ) : (
                      <Tag>{t("duplicateReview.sourceRule")}</Tag>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <CopyTile
                      copy={pair.keep}
                      badge={t("duplicateReview.keepBadge", { reason: keepReason })}
                      badgeStyle={{ color: "var(--ui-success)" }}
                      borderStyle="1px solid var(--ui-success)"
                    />
                    <CopyTile
                      copy={pair.drop}
                      badge={t("duplicateReview.removeBadge")}
                      badgeStyle={{ color: "var(--ui-on-error-container)" }}
                      borderStyle="1px solid var(--ui-outline-variant)"
                    />
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
};

export default React.memo(DuplicateReviewModal);
