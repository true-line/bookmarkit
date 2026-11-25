// #102: Asking the archive about a batch of dead links, politely.
//
// What a snapshot is and whether one can be trusted is `utils/archiveRecovery.js`.
// This is only pacing, progress and a stop button — the same division the sweep
// (#47) uses, and for the same reason: one host is about to be asked a question per
// dead link, and doing that as fast as a loop can is how a helpful lookup becomes a
// scrape.
//
// It writes nothing. The rows it returns are reviewed first (#44's modal), so the
// only thing that re-points a bookmark is a user accepting the change.

import { useCallback, useEffect, useRef, useState } from "react";

import { getMessages } from "../i18n/index.js";
import { archiveRow, findSnapshot, recoverable } from "../utils/archiveRecovery.js";

const PACING = Object.freeze({
  gapMs: 350, // between lookups
  limit: 50, // per run, so a collection of thousands cannot start a scrape
});

const IDLE = Object.freeze({ running: false, done: 0, total: 0 });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Look for archived copies of the dead links in a list.
 *
 * @param {object} [params]
 * @param {(message: string, type?: string) => void} [params.showMessage]
 * @param {{gapMs?: number, limit?: number}} [params.pacing] Overridable, for tests.
 * @returns {{running: boolean, done: number, total: number, run: (list: object[]) => Promise<{rows: object[], asked: string[]}>, stop: Function}}
 *   `run` answers with the reviewable rows it found — one per link an archived
 *   copy exists for — and the ids it actually put a question about, hits and
 *   misses (#295: a caller tracking attempts needs to know which misses were
 *   really asked; a run cut short by `stop` answers with only the ones reached).
 */
export function useArchiveRecovery({ showMessage, pacing } = {}) {
  const [progress, setProgress] = useState(IDLE);
  const runningRef = useRef(false);
  const latest = useRef(null);
  latest.current = { showMessage, pacing: { ...PACING, ...(pacing || {}) } };

  useEffect(
    () => () => {
      runningRef.current = false;
    },
    []
  );

  const stop = useCallback(() => {
    runningRef.current = false;
    setProgress(IDLE);
  }, []);

  const run = useCallback(async (list = []) => {
    const answered = { rows: [], asked: [] };
    if (runningRef.current) return answered;
    const { showMessage, pacing } = latest.current;
    const dead = recoverable(list).slice(0, pacing.limit);
    if (dead.length === 0) {
      showMessage?.(getMessages()("archiveRecovery.noDeadLinks"), "info");
      return answered;
    }

    runningRef.current = true;
    setProgress({ running: true, done: 0, total: dead.length });
    try {
      for (const bookmark of dead) {
        if (!runningRef.current) break;
        const row = archiveRow(bookmark, await findSnapshot(bookmark.url));
        // Asked whether or not a copy came back: a miss is an answer too, and
        // the caller recording attempts has to know it was really made.
        answered.asked.push(bookmark.id);
        if (row) answered.rows.push(row);
        setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        if (pacing.gapMs) await sleep(pacing.gapMs);
      }
      // A lookup that finds nothing is the common case for a link that died young,
      // so it is reported as an outcome rather than as a failure.
      if (answered.rows.length === 0) {
        showMessage?.(getMessages()("archiveRecovery.noneFound"), "info");
      }
      return answered;
    } catch (error) {
      console.error("Archive lookup failed:", error);
      showMessage?.(getMessages()("archiveRecovery.stoppedEarly"), "error");
      return answered;
    } finally {
      runningRef.current = false;
      setProgress(IDLE);
    }
  }, []);

  return { ...progress, run, stop };
}
