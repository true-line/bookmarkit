import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, waitFor } from "@testing-library/react";

import { useLinkSweep } from "./useLinkSweep.js";

const CHECKED_AT_KEY = "bookmarkit.linkSweep.checkedAt";

// No waiting in tests: the pacing is the point of the hook, not of these cases.
const NO_PACING = { gapMs: 0, batchPauseMs: 0, idlePollMs: 0, batchSize: 2 };

const bookmark = (id, extra = {}) => ({
  id,
  title: id,
  url: `https://example.com/${id}`,
  urlStatus: "valid",
  ...extra,
});

let sweep;
let store;
let showMessage;

const Probe = ({ bookmarks, pacing = NO_PACING }) => {
  sweep = useLinkSweep({ bookmarks, storeRef: { current: store }, showMessage, pacing });
  return (
    <span data-testid="progress">{sweep.running ? `${sweep.checked}/${sweep.total}` : "idle"}</span>
  );
};

const answerWith = (statusFor) => {
  globalThis.chrome = {
    runtime: {
      id: "test",
      sendMessage: vi.fn((message, respond) =>
        respond({ status: statusFor(message.url), redirectUrl: null })
      ),
    },
  };
};

beforeEach(() => {
  sweep = undefined;
  showMessage = vi.fn();
  store = { updateMany: vi.fn(async () => {}), update: vi.fn(async () => {}) };
  localStorage.clear();
});

afterEach(() => {
  delete globalThis.chrome;
});

describe("useLinkSweep (#47)", () => {
  it("writes a status only for the links whose status changed", async () => {
    answerWith((url) => (url.endsWith("dead") ? "invalid" : "valid"));
    const bookmarks = [bookmark("alive"), bookmark("dead")];
    render(<Probe bookmarks={bookmarks} />);

    await act(async () => {
      await sweep.start();
    });

    expect(store.updateMany).toHaveBeenCalledTimes(1);
    expect(store.updateMany).toHaveBeenCalledWith([
      { id: "dead", urlStatus: "invalid", urlStatusReason: null },
    ]);
  });

  it("checks in batches until the collection is done", async () => {
    answerWith(() => "valid");
    const bookmarks = Array.from({ length: 5 }, (_, i) => bookmark(`b${i}`));
    render(<Probe bookmarks={bookmarks} />);

    await act(async () => {
      await sweep.start();
    });

    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledTimes(5);
  });

  it("leaves links alone that were checked recently, and says so", async () => {
    answerWith(() => "valid");
    const checkedAt = { a: Date.now() };
    localStorage.setItem(CHECKED_AT_KEY, JSON.stringify(checkedAt));
    render(<Probe bookmarks={[bookmark("a")]} />);

    await act(async () => {
      await sweep.start();
    });

    expect(globalThis.chrome.runtime.sendMessage).not.toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith(expect.stringMatching(/checked recently/i), "info");
  });

  it("remembers what it checked, so the next run resumes instead of restarting", async () => {
    answerWith(() => "valid");
    render(<Probe bookmarks={[bookmark("a")]} />);

    await act(async () => {
      await sweep.start();
    });

    expect(JSON.parse(localStorage.getItem(CHECKED_AT_KEY))).toHaveProperty("a");
  });

  it("forgets bookmarks that are gone rather than growing forever", async () => {
    answerWith(() => "valid");
    localStorage.setItem(CHECKED_AT_KEY, JSON.stringify({ deleted: 1 }));
    render(<Probe bookmarks={[bookmark("a")]} />);

    await act(async () => {
      await sweep.start();
    });

    expect(JSON.parse(localStorage.getItem(CHECKED_AT_KEY))).not.toHaveProperty("deleted");
  });

  it("never asks about an internal host, even if one is bookmarked", async () => {
    answerWith(() => "valid");
    render(<Probe bookmarks={[bookmark("internal", { url: "http://127.0.0.1/admin" })]} />);

    await act(async () => {
      await sweep.start();
    });

    expect(globalThis.chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it("skips a link the user marked as one to leave alone", async () => {
    answerWith(() => "valid");
    render(<Probe bookmarks={[bookmark("kept", { urlStatus: "ignored" })]} />);

    await act(async () => {
      await sweep.start();
    });

    expect(globalThis.chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it("stops when told to, leaving the rest unchecked", async () => {
    answerWith(() => "valid");
    const bookmarks = Array.from({ length: 6 }, (_, i) => bookmark(`b${i}`));
    render(<Probe bookmarks={bookmarks} />);
    // Stop arrives while the first batch is in flight.
    globalThis.chrome.runtime.sendMessage.mockImplementation((message, respond) => {
      sweep.stop();
      respond({ status: "valid", redirectUrl: null });
    });

    await act(async () => {
      await sweep.start();
    });

    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
  });

  // Recording the whole batch would hide the links it never reached for a week,
  // and the next run would claim everything was checked recently.
  it("records only the links it really checked when stopped mid-batch", async () => {
    answerWith(() => "valid");
    render(<Probe bookmarks={[bookmark("first"), bookmark("second")]} />);
    globalThis.chrome.runtime.sendMessage.mockImplementation((message, respond) => {
      sweep.stop();
      respond({ status: "valid", redirectUrl: null });
    });

    await act(async () => {
      await sweep.start();
    });

    const recorded = JSON.parse(localStorage.getItem(CHECKED_AT_KEY));
    expect(Object.keys(recorded)).toEqual(["first"]);
  });

  it("only one sweep runs at a time", async () => {
    answerWith(() => "valid");
    render(<Probe bookmarks={[bookmark("a"), bookmark("b")]} />);

    await act(async () => {
      await Promise.all([sweep.start(), sweep.start()]);
    });

    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
  });

  it("falls back to one write per link when the store has no batch write", async () => {
    answerWith(() => "invalid");
    store = { update: vi.fn(async () => {}) };
    render(<Probe bookmarks={[bookmark("a"), bookmark("b")]} />);

    await act(async () => {
      await sweep.start();
    });

    expect(store.update).toHaveBeenCalledTimes(2);
    expect(store.update).toHaveBeenCalledWith("a", {
      urlStatus: "invalid",
      urlStatusReason: null,
    });
  });

  it("reports a failure instead of leaving the bar spinning", async () => {
    answerWith(() => "invalid");
    store = {
      updateMany: vi.fn(async () => {
        throw new Error("store is gone");
      }),
    };
    render(<Probe bookmarks={[bookmark("a")]} />);

    await act(async () => {
      await sweep.start();
    });

    expect(showMessage).toHaveBeenCalledWith(expect.stringMatching(/stopped early/i), "error");
    expect(sweep.running).toBe(false);
  });

  // #295: the summary's "N checked" is the record of past checks, loaded when
  // the hook mounts rather than when the first sweep runs.
  it("counts the links the record says were checked", async () => {
    localStorage.setItem(CHECKED_AT_KEY, JSON.stringify({ a: 1, b: 2 }));
    render(<Probe bookmarks={[bookmark("a"), bookmark("b"), bookmark("c")]} />);

    await waitFor(() => expect(sweep.checkedTotal).toBe(2));
    expect(sweep.running).toBe(false);
  });

  it("grows the count as a sweep records checks", async () => {
    answerWith(() => "valid");
    render(<Probe bookmarks={[bookmark("a"), bookmark("b")]} />);
    await waitFor(() => expect(sweep.checkedTotal).toBe(0));

    await act(async () => {
      await sweep.start();
    });

    expect(sweep.checkedTotal).toBe(2);
  });
});

// #303: the freshness line — when the sweep last ran, persisted beside the
// record of past checks and read before any sweep runs this session.
describe("useLinkSweep's last-sweep timestamp (#303)", () => {
  const LAST_SWEEP_AT_KEY = "bookmarkit.linkSweep.lastSweepAt";

  it("starts from storage, so the line is right before any sweep runs", async () => {
    localStorage.setItem(LAST_SWEEP_AT_KEY, "1234567890");
    render(<Probe bookmarks={[bookmark("a")]} />);

    await waitFor(() => expect(sweep.lastSweepAt).toBe(1234567890));
  });

  it("reads nothing as never, not as an error", async () => {
    localStorage.setItem(LAST_SWEEP_AT_KEY, "garbage");
    render(<Probe bookmarks={[bookmark("a")]} />);

    await waitFor(() => expect(sweep.lastSweepAt).toBeNull());
  });

  it("stamps the time of each batch it checked", async () => {
    answerWith(() => "valid");
    render(<Probe bookmarks={[bookmark("a")]} />);

    await act(async () => {
      await sweep.start();
    });

    expect(Number(localStorage.getItem(LAST_SWEEP_AT_KEY))).toBeGreaterThan(0);
    expect(sweep.lastSweepAt).toBe(Number(localStorage.getItem(LAST_SWEEP_AT_KEY)));
  });

  // A sweep stopped halfway has still refreshed everything it reached, so
  // the freshness line says when that was — not only complete sweeps count.
  it("keeps the stamp when the sweep is stopped mid-batch", async () => {
    answerWith(() => "valid");
    render(<Probe bookmarks={[bookmark("first"), bookmark("second")]} />);
    globalThis.chrome.runtime.sendMessage.mockImplementation((message, respond) => {
      sweep.stop();
      respond({ status: "valid", redirectUrl: null });
    });

    await act(async () => {
      await sweep.start();
    });

    expect(sweep.lastSweepAt).not.toBeNull();
  });
});
