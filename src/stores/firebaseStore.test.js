import { describe, it, expect, beforeEach, vi } from "vitest";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { createFirebaseStore } from "./firebaseStore.js";

// The Firebase SDK is replaced with the smallest surface the store touches, so
// the observers it registers can be driven directly. The double keeps an
// in-memory collection, because #358 hid behind a double whose query/orderBy
// were identity functions: a document written without the ordered field was
// still handed back, while real Firestore excludes it. Ordered queries here
// apply that existence filter, and every committed write fires one snapshot
// event, so write counts and notification counts are observable.
const sdk = vi.hoisted(() => {
  const sdk = {
    auth: [],
    snapshots: [],
    paths: [],
    docs: [],
    writes: 0,
    seq: 0,
    signIn: () => Promise.resolve(),
  };
  sdk.fireSnapshot = () => {
    for (const listener of sdk.snapshots) {
      const fields = listener.orderFields ?? [];
      const docs = sdk.docs
        .filter((d) => fields.every((field) => d.data[field] !== undefined))
        .map((d) => ({ id: d.id, data: () => ({ ...d.data }) }));
      listener.next({ docs });
    }
  };
  return sdk;
});

vi.mock("firebase/app", () => ({ initializeApp: () => ({}) }));

vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  onAuthStateChanged: (_auth, next, onError) => {
    const observer = { next, onError, unsubscribed: false };
    sdk.auth.push(observer);
    return () => {
      observer.unsubscribed = true;
    };
  },
  signInAnonymously: () => sdk.signIn(),
  signInWithCustomToken: () => sdk.signIn(),
}));

vi.mock("firebase/firestore", () => {
  const applySet = (ref, data, merge) => {
    const existing = sdk.docs.find((d) => d.id === ref?.id);
    if (existing) existing.data = merge ? { ...existing.data, ...data } : { ...data };
    else sdk.docs.push({ id: ref?.id, data: { ...data } });
  };
  return {
    getFirestore: () => ({}),
    enableIndexedDbPersistence: () => Promise.resolve(),
    collection: (_db, ...segments) => {
      const path = segments.join("/");
      sdk.paths.push(path);
      return { path };
    },
    // Firestore generates an id when doc() is called without one, and a query
    // carries the fields named in its orderBy() clauses so reads can apply the
    // existence filter that excludes documents lacking them (#358).
    doc: (_parent, id) => ({ id: id ?? `doc-${++sdk.seq}` }),
    query: (ref, ...clauses) => ({
      source: ref,
      orderFields: clauses.map((clause) => clause?.field).filter(Boolean),
    }),
    orderBy: (field) => ({ field }),
    onSnapshot: (target, next, onError) => {
      sdk.snapshots.push({ next, onError, orderFields: target?.orderFields ?? [] });
      return () => {};
    },
    getDocs: (target) => {
      const fields = target?.orderFields ?? [];
      const docs = sdk.docs
        .filter((d) => fields.every((field) => d.data[field] !== undefined))
        .map((d) => ({ id: d.id, data: () => ({ ...d.data }), ref: { id: d.id } }));
      return Promise.resolve({ docs });
    },
    addDoc: (_ref, data) => {
      const id = `doc-${++sdk.seq}`;
      sdk.docs.push({ id, data: { ...data } });
      sdk.writes += 1;
      sdk.fireSnapshot();
      return Promise.resolve({ id });
    },
    setDoc: (ref, data, options) => {
      applySet(ref, data, options?.merge ?? false);
      sdk.writes += 1;
      sdk.fireSnapshot();
      return Promise.resolve();
    },
    deleteDoc: (ref) => {
      sdk.docs = sdk.docs.filter((d) => d.id !== ref?.id);
      sdk.writes += 1;
      sdk.fireSnapshot();
      return Promise.resolve();
    },
    writeBatch: () => {
      const ops = [];
      return {
        set: (ref, data, options) => {
          ops.push({ ref, data, merge: options?.merge ?? false });
          sdk.writes += 1;
        },
        delete: (ref) => {
          ops.push({ ref, delete: true });
          sdk.writes += 1;
        },
        commit: () => {
          for (const op of ops) {
            if (op.delete) sdk.docs = sdk.docs.filter((d) => d.id !== op.ref.id);
            else applySet(op.ref, op.data, op.merge);
          }
          const applied = ops.length;
          ops.length = 0;
          if (applied > 0) sdk.fireSnapshot();
          return Promise.resolve();
        },
      };
    },
  };
});

const newStore = (options) =>
  createFirebaseStore({ firebaseConfig: { apiKey: "k" }, appId: "app", ...options });

// Let the store register its auth observer, then answer it.
const answerAuth = async (user) => {
  await Promise.resolve();
  sdk.auth.at(-1).next(user);
  await Promise.resolve();
};

// Register the store, answer auth with a signed-in user, and wait for init.
const initialized = async (options) => {
  const store = newStore(options);
  const init = store.init();
  await answerAuth({ uid: "user-1" });
  await init;
  return store;
};

describe("firebaseStore sign-in (#18)", () => {
  beforeEach(() => {
    sdk.auth.length = 0;
    sdk.snapshots.length = 0;
    sdk.paths.length = 0;
    sdk.docs.length = 0;
    sdk.writes = 0;
    sdk.seq = 0;
    sdk.signIn = () => Promise.resolve();
  });

  it("fails init when sign-in is refused, instead of carrying on with no user", async () => {
    sdk.signIn = () => Promise.reject(new Error("auth/admin-restricted-operation"));
    const store = newStore();

    const init = store.init();
    await answerAuth(null);

    await expect(init).rejects.toThrow(/sign-in failed.*admin-restricted/u);
    // The path that would have been built is artifacts/app/users/null/bookmarks.
    expect(sdk.paths.some((path) => path.includes("null"))).toBe(false);
    expect(sdk.auth.at(-1).unsubscribed).toBe(true);
  });

  it("fails init when the auth observer itself errors", async () => {
    const store = newStore();

    const init = store.init();
    await Promise.resolve();
    sdk.auth.at(-1).onError(new Error("network-request-failed"));

    await expect(init).rejects.toThrow(/sign-in failed.*network-request-failed/u);
  });

  it("reads the signed-in user's own collection", async () => {
    const store = newStore();

    const init = store.init();
    await answerAuth({ uid: "user-1" });
    await init;

    expect(sdk.paths).toContain("artifacts/app/users/user-1/bookmarks");
  });
});

describe("firebaseStore snapshot failures (#18)", () => {
  beforeEach(() => {
    sdk.auth.length = 0;
    sdk.snapshots.length = 0;
    sdk.paths.length = 0;
    sdk.docs.length = 0;
    sdk.writes = 0;
    sdk.seq = 0;
    sdk.signIn = () => Promise.resolve();
  });

  it("keeps the last list when the subscription drops, rather than emptying it", async () => {
    const onError = vi.fn();
    const store = await initialized({ onError });
    const emissions = [];
    store.subscribe((all) => emissions.push(all));

    sdk.snapshots.at(-1).next({ docs: [{ id: "a", data: () => ({ title: "A" }) }] });
    expect(emissions).toEqual([[{ id: "a", title: "A" }]]);

    // An expired token, a rules change, or a dropped connection.
    sdk.snapshots.at(-1).onError(new Error("permission-denied"));

    // No second emission: subscribers still hold the list they were given.
    expect(emissions).toHaveLength(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "permission-denied" }));
  });

  it("does not require an onError handler", async () => {
    const store = await initialized();
    store.subscribe(() => {});
    expect(() => sdk.snapshots.at(-1).onError(new Error("permission-denied"))).not.toThrow();
  });
});

describe("firebaseStore keeps written bookmarks (#358)", () => {
  beforeEach(() => {
    sdk.auth.length = 0;
    sdk.snapshots.length = 0;
    sdk.paths.length = 0;
    sdk.docs.length = 0;
    sdk.writes = 0;
    sdk.seq = 0;
    sdk.signIn = () => Promise.resolve();
  });

  it("applies the existence filter of an ordered query, as Firestore does", async () => {
    // The double must hide documents that lack a field named in orderBy(),
    // or a query-ordered regression like #358 stays invisible to the suite.
    sdk.docs.push(
      { id: "positioned", data: { title: "Positioned", position: 1 } },
      { id: "bare", data: { title: "Bare" } }
    );
    const ref = collection({}, "artifacts", "app", "users", "user-1", "bookmarks");

    const snap = await getDocs(query(ref, orderBy("position", "asc")));

    expect(snap.docs.map((d) => d.id)).toEqual(["positioned"]);
  });

  it("keeps a bookmark from create() in the snapshot and in list()", async () => {
    const store = await initialized();
    const emissions = [];
    store.subscribe((all) => emissions.push(all));

    const created = await store.create({ title: "Kept", url: "https://kept.example" });

    // One write — no second setDoc to store the id — and one notification.
    expect(sdk.writes).toBe(1);
    expect(emissions).toHaveLength(1);
    expect(emissions[0]).toEqual([
      expect.objectContaining({ id: created.id, title: "Kept", url: "https://kept.example" }),
    ]);

    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: created.id, title: "Kept", url: "https://kept.example" });
  });

  it("keeps bookmarks from bulkAdd() in the snapshot and in list()", async () => {
    const store = await initialized();
    const emissions = [];
    store.subscribe((all) => emissions.push(all));

    const added = await store.bulkAdd([
      { title: "First", url: "https://first.example" },
      { title: "Second", url: "https://second.example" },
    ]);

    // The import is one commit and one notification for the whole batch.
    expect(sdk.writes).toBe(2);
    expect(emissions).toHaveLength(1);
    expect(emissions[0].map((b) => b.title)).toEqual(["First", "Second"]);

    const listed = await store.list();
    expect(listed.map((b) => b.title)).toEqual(["First", "Second"]);
    expect(listed.map((b) => b.id)).toEqual(added.map((b) => b.id));
  });

  it("orders by position, then title, with position-less documents last", async () => {
    const store = await initialized();
    const emissions = [];
    store.subscribe((all) => emissions.push(all));

    sdk.docs.push(
      { id: "mid", data: { title: "Beta", position: 1 } },
      { id: "tail", data: { title: "Aardvark" } },
      { id: "head", data: { title: "alpha", position: 0 } }
    );
    sdk.fireSnapshot();

    // "Aardvark" would sort first by title alone; without a position it is
    // last, not hidden. Title ties compare case-insensitively.
    const titles = ["alpha", "Beta", "Aardvark"];
    expect(emissions.at(-1).map((b) => b.title)).toEqual(titles);

    const listed = await store.list();
    expect(listed.map((b) => b.title)).toEqual(titles);
  });

  it("reorderBookmarks reaches documents an ordered query would have hidden", async () => {
    const store = await initialized();
    sdk.docs.push(
      { id: "visible", data: { title: "Visible", position: 0 } },
      { id: "hidden", data: { title: "Hidden" } }
    );

    await store.reorderBookmarks(["hidden", "visible"]);

    const listed = await store.list();
    expect(listed.map((b) => b.id)).toEqual(["hidden", "visible"]);
    expect(listed.map((b) => b.position)).toEqual([0, 1]);
  });
});
