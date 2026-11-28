// Firebase implementation conforming to the common store interface
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
  collection,
  doc,
  onSnapshot,
  addDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { chunk, MAX_FIRESTORE_BATCH_OPS } from "./batching.js";
import { sortBookmarksByField } from "./bookmarkSort.js";

// #358: Firestore's orderBy() is also an existence filter — a document that
// lacks the ordered field is silently dropped from the result. create() and
// bulkAdd() write no position field, so an ordered read hid exactly the
// bookmarks they had just written, and nothing repaired them later because
// reorderBookmarks() builds from list(). The app reads the collection in full
// anyway, so reads fetch every document and sort here: position ascending,
// documents without a position last, then title (case-insensitive, like
// persistSortedOrder).
const byPositionThenTitle = (a, b) => {
  const posA = typeof a.position === "number" ? a.position : Number.POSITIVE_INFINITY;
  const posB = typeof b.position === "number" ? b.position : Number.POSITIVE_INFINITY;
  if (posA !== posB) return posA - posB;
  const titleA = typeof a.title === "string" ? a.title.toLowerCase() : "";
  const titleB = typeof b.title === "string" ? b.title.toLowerCase() : "";
  return titleA < titleB ? -1 : titleA > titleB ? 1 : 0;
};

/**
 * @param {object} options
 * @param {(error: Error) => void} [options.onError] Reports a failure that
 *   happens after init has resolved — a dropped subscription, say — which has no
 *   call to reject.
 */
export function createFirebaseStore({ firebaseConfig, appId, initialAuthToken, onError }) {
  let listeners = new Set();
  let unsubSnapshot = null;
  let unsubAuth = null;
  let db = null;
  let auth = null;
  let userId = null;
  // Depth of chunked writes this store is making itself (#359). Every
  // committed batch echoes a snapshot, so while a write is in flight those
  // echoes are dropped and the outermost release notifies once from a fresh
  // read — DESIGN.md's "one write, one notification, whatever its size",
  // which the chrome store keeps the same way.
  let writeDepth = 0;

  const notify = (all) => listeners.forEach((cb) => cb(all));

  const collectionRef = () => collection(db, "artifacts", appId, "users", userId, "bookmarks");

  const readAll = async () => {
    const snap = await getDocs(collectionRef());
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byPositionThenTitle);
  };

  // #15: Commit a list of write operations in batches of <=500 (the Firestore
  // limit). Each op is a function that applies one write to the passed batch.
  // NOTE: chunking sacrifices cross-chunk atomicity for operations that exceed
  // the limit; a non-destructive/rollback strategy is tracked separately (#18).
  //
  // #359: the whole run is one store write, so the snapshot echoes the
  // batches produce are dropped and the notification happens here — a fresh
  // read once the last commit has landed, on the failure path too, because a
  // batch that throws may leave earlier chunks committed and a listener left
  // on the old list would be exactly the #18 mistake in reverse.
  const commitInChunks = async (ops) => {
    writeDepth += 1;
    try {
      for (const group of chunk(ops, MAX_FIRESTORE_BATCH_OPS)) {
        const batch = writeBatch(db);
        group.forEach((applyOp) => applyOp(batch));
        await batch.commit();
      }
    } finally {
      writeDepth -= 1;
      if (writeDepth === 0) {
        try {
          notify(await readAll());
        } catch (error) {
          // The write may be fine with the read failing behind it; the
          // subscription or the caller reports a read failure instead of
          // this release masking the write's own error.
          console.error("Firestore read after write failed:", error);
          onError?.(error);
        }
      }
    }
  };

  const api = {
    async init() {
      if (!firebaseConfig) throw new Error("firebaseConfig required");
      const app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      await new Promise((resolve, reject) => {
        let settled = false;
        // #18: Sign-in failure used to resolve with userId still null, and every
        // later call then built the path artifacts/<appId>/users/null/bookmarks
        // and threw. Fail init instead, so the caller can say what happened.
        //
        // #19: the listener lives in unsubAuth rather than a local, because both
        // ways of settling leave init without ever seeing a user, and a teardown
        // that could not reach it would leak it.
        const settle = (error) => {
          if (settled) return;
          settled = true;
          unsubAuth?.();
          unsubAuth = null;
          if (error) reject(new Error(`Firebase sign-in failed: ${error?.message || error}`));
          else resolve();
        };
        unsubAuth = onAuthStateChanged(
          auth,
          async (user) => {
            if (user) {
              userId = user.uid;
              settle();
              return;
            }
            try {
              if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
              else await signInAnonymously(auth);
              // Success re-enters this callback with a user.
            } catch (error) {
              settle(error);
            }
          },
          settle
        );
        // The observer may have fired before the unsubscribe existed.
        if (settled) {
          unsubAuth?.();
          unsubAuth = null;
        }
      });
      // PERF-04: Enable offline persistence so the app works without network on startup.
      try {
        await enableIndexedDbPersistence(db);
      } catch (e) {
        if (e.code === "failed-precondition") {
          // Multiple tabs open — persistence only works in one tab at a time.
          console.warn("Firestore offline persistence unavailable: multiple tabs open.");
        } else if (e.code === "unimplemented") {
          // Browser does not support IndexedDB.
          console.warn("Firestore offline persistence unavailable: browser unsupported.");
        }
      }
      // PERF-04: Subscribe to changes with error handler to detect auth/rules failures
      unsubSnapshot = onSnapshot(
        collectionRef(),
        (snapshot) => {
          // #359: echoes of this store's own chunked writes are dropped here;
          // commitInChunks reads the finished collection once and notifies.
          if (writeDepth > 0) return;
          const all = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort(byPositionThenTitle);
          notify(all);
        },
        (error) => {
          // PERF-04: Handle subscription errors (e.g., expired auth token, changed rules)
          // #18: Emitting [] here made every bookmark look deleted, and a save
          // from that view would have been made against an empty list. Keep the
          // last list subscribers received and report the failure instead.
          console.error("Firestore snapshot subscription error:", error);
          onError?.(error);
        }
      );
    },
    async list() {
      return readAll();
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    // #19: Detach the Firestore snapshot and any still-pending auth listener.
    teardown() {
      unsubSnapshot?.();
      unsubSnapshot = null;
      unsubAuth?.();
      unsubAuth = null;
      listeners.clear();
    },
    async create(bookmark) {
      // #358: one write. Readers take the id from the document reference, so
      // the follow-up setDoc that stored it under `id` only cost a second
      // write and a second snapshot notification for the same bookmark.
      const ref = await addDoc(collectionRef(), {
        ...bookmark,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { ...bookmark, id: ref.id };
    },
    async update(id, patch) {
      const ref = doc(collectionRef(), id);
      await setDoc(ref, { ...patch, updatedAt: new Date().toISOString() }, { merge: true });
    },
    // #54: A bulk edit is one commit rather than one request per bookmark.
    async updateMany(patches = []) {
      if (!patches || patches.length === 0) return;
      const now = new Date().toISOString();
      const ops = patches.map(
        ({ id, ...patch }) =>
          (batch) =>
            batch.set(doc(collectionRef(), id), { ...patch, updatedAt: now }, { merge: true })
      );
      await commitInChunks(ops);
    },
    async remove(id) {
      const ref = doc(collectionRef(), id);
      await deleteDoc(ref);
    },
    async removeMany(ids = []) {
      if (!ids || ids.length === 0) return;
      const ops = ids.map((id) => (batch) => batch.delete(doc(collectionRef(), id)));
      await commitInChunks(ops);
    },
    async bulkReplace(bookmarks) {
      const snap = await getDocs(collectionRef());
      const ops = [];
      snap.forEach((d) => ops.push((batch) => batch.delete(d.ref)));
      bookmarks.forEach((b, index) => {
        const dref = doc(collectionRef());
        const data = {
          ...b,
          id: dref.id,
          position: typeof b.position === "number" ? b.position : index,
          createdAt: b.createdAt || new Date().toISOString(),
          updatedAt: b.updatedAt || new Date().toISOString(),
        };
        ops.push((batch) => batch.set(dref, data));
      });
      await commitInChunks(ops);
    },
    async bulkAdd(bookmarks) {
      // #358: no position is written, so these documents sort after every
      // positioned one (see byPositionThenTitle). Reorder handles explicit
      // ordering afterward.
      const added = [];
      const ops = [];
      bookmarks.forEach((b) => {
        const dref = doc(collectionRef());
        const data = {
          ...b,
          id: dref.id,
          createdAt: b.createdAt || new Date().toISOString(),
          updatedAt: b.updatedAt || new Date().toISOString(),
        };
        ops.push((batch) => batch.set(dref, data));
        added.push(data);
      });
      await commitInChunks(ops);
      return added;
    },
    /**
     * Set explicit order using a position field. Items not in orderedIds keep their relative order and are appended.
     */
    async reorderBookmarks(orderedIds = []) {
      const current = await this.list();
      const existingIds = current.map((b) => b.id);
      const orderedSet = new Set(orderedIds);
      const normalized = [
        ...orderedIds.filter((id) => existingIds.includes(id)),
        ...existingIds.filter((id) => !orderedSet.has(id)),
      ];
      // #359: position only. The local store's reorder is a
      // chrome.bookmarks.move and touches no metadata, so "Date modified"
      // survives a sort there — stamping every positioned document here made
      // Firebase mode the one backend where it did not.
      const ops = normalized.map(
        (id, idx) => (batch) =>
          batch.set(doc(collectionRef(), id), { position: idx }, { merge: true })
      );
      await commitInChunks(ops);
    },
    /**
     * Compute a sorted order by field and persist via positions.
     */
    async persistSortedOrder({ sortBy = "title", order = "asc" } = {}) {
      const list = await this.list();
      const orderedIds = sortBookmarksByField(list, { sortBy, order }).map((b) => b.id);
      await this.reorderBookmarks(orderedIds);
    },
  };

  return api;
}
