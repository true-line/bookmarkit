import React, { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import LinkHealthView from "./LinkHealthView.jsx";

// #295: the view is the broken-links mockup's page — summary, re-check, and
// the archive's proposals reviewed in place. The pieces it reads are tested
// beside their modules (linkHealth, archiveRecovery, useLinkSweep); these pin
// the view's own contract: the review stance it shares with the dialog
// (everything starts accepted, unticking is the disagreement, nothing writes
// until Apply Selected), the chip that carries its words with its color, and
// the two asked-for network steps stopping when told to.
//
// #303 branches on the sidebar-viewport hook, which reads matchMedia. jsdom
// has none — the hook would default to the sheet — so every suite pins the
// composition it means to exercise: the workspace from `lg`, the sheet below.
const installViewport = (isWide) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    query,
    matches: isWide,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
};

afterEach(() => {
  delete window.matchMedia;
  vi.useRealTimers();
});

// #303 (codex): the app owns the unticked set, so the view's tests stand in
// for it with this stateful shell — rejections behave here exactly as they do
// across the app's two compositions.
const Harness = (props) => {
  const [rejected, setRejected] = useState(() => new Set());
  return (
    <LinkHealthView
      rejectedIds={rejected}
      onToggleRejected={(id) =>
        setRejected((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        })
      }
      {...props}
    />
  );
};

const dead = (id, title, reason, extra = {}) => ({
  id,
  title,
  url: `https://gone.test/${id}`,
  urlStatus: "invalid",
  urlStatusReason: reason,
  ...extra,
});

const broken = [
  dead("1", "Structured Outputs", "http:404"),
  dead("2", "Subgrid Patterns", "unreachable"),
];

const snapshots = { 1: "https://web.archive.org/web/20240512/https://gone.test/1" };

const setup = (over = {}) => {
  installViewport(over.belowLg ? false : true);
  const handlers = {
    onRecheck: vi.fn(),
    onStopSweep: vi.fn(),
    onFindSnapshots: vi.fn(),
    onStopArchive: vi.fn(),
    onApply: vi.fn(),
    onEdit: vi.fn(),
    onWayback: vi.fn(),
    onClose: vi.fn(),
  };
  render(
    <Harness
      checkedTotal={1024}
      unreachableCount={broken.length}
      broken={broken}
      proposalUrls={snapshots}
      // The app decides whether a lookup is owed (which links it has already
      // asked about, misses included); the fixtures start with one owed.
      needsLookup
      lastSweepAt={over.lastSweepAt ?? Date.now() - 2 * 60 * 60 * 1000}
      {...handlers}
      {...over}
    />
  );
  return handlers;
};

describe("LinkHealthView's summary and actions (#295)", () => {
  it("says how many links were checked, how many are unreachable, and when the sweep last ran", () => {
    setup();

    expect(screen.getByText(/1,024 checked · 2 unreachable/)).toBeInTheDocument();
    expect(screen.getByText("Last scan 2 hours ago")).toBeInTheDocument();
    expect(
      screen.getByText("Recovery proposes snapshot URLs without overwriting automatically.")
    ).toBeInTheDocument();
  });

  it("hides the freshness line when no sweep has ever run", () => {
    setup({ lastSweepAt: null });

    expect(screen.queryByText(/Last scan/)).toBeNull();
  });

  it("re-checks on request", () => {
    const { onRecheck } = setup();

    expect(screen.queryByText("Checking links…")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Re-check Links" }));
    expect(onRecheck).toHaveBeenCalledTimes(1);
  });

  it("stops a sweep that is running, reporting its pace", () => {
    const { onStopSweep } = setup({ sweepRunning: true, sweepChecked: 1, sweepTotal: 4 });

    expect(screen.getByText("Checking links…")).toBeInTheDocument();
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Re-check Links" })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Stop" })[0]);
    expect(onStopSweep).toHaveBeenCalledTimes(1);
  });

  it("stops an archive lookup that is running, and offers none while it does", () => {
    const { onStopArchive } = setup({
      proposalUrls: {},
      archiveRunning: true,
      archiveDone: 1,
      archiveTotal: 2,
    });

    expect(screen.getByText("Asking the archive… 1 of 2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Find Archive Snapshots" })).toBeNull();
    // The sweep is not running, so the only Stop is the lookup's.
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStopArchive).toHaveBeenCalledTimes(1);
  });

  it("asks the archive while any dead link still has no snapshot", () => {
    const { onFindSnapshots } = setup({ proposalUrls: {} });

    fireEvent.click(screen.getByRole("button", { name: "Find Archive Snapshots" }));
    expect(onFindSnapshots).toHaveBeenCalledTimes(1);
  });

  it("offers nothing once the app says every dead link has been asked about", () => {
    // The offer is the app's call now (codex, #295): a link asked about and
    // missed stages no snapshot, but it is not a link worth asking again.
    setup({
      proposalUrls: {},
      needsLookup: false,
    });

    expect(screen.queryByRole("button", { name: "Find Archive Snapshots" })).toBeNull();
  });

  it("says when nothing is unreachable", () => {
    setup({ broken: [], proposalUrls: {} });

    expect(
      screen.getByText("Nothing unreachable — every link the sweep could reach answered.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-check Links" })).toBeEnabled();
  });
});

describe("LinkHealthView's status banner (#303)", () => {
  it("raises the mobile mockup's alarm over the rows, with the count at its end", () => {
    setup({ proposalUrls: {} });

    expect(screen.getByText("2 bookmarks returned HTTP errors or timeouts.")).toBeInTheDocument();
  });

  it("uses the singular for one dead link", () => {
    setup({ broken: broken.slice(0, 1), proposalUrls: {} });

    expect(screen.getByText("1 bookmark returned HTTP errors or timeouts.")).toBeInTheDocument();
  });

  it("stays away when all is well", () => {
    setup({ broken: [], proposalUrls: {} });

    expect(screen.queryByText(/returned HTTP errors or timeouts/)).toBeNull();
  });
});

describe("LinkHealthView's proposal rows (#295)", () => {
  it("shows the dead address, the proposed snapshot, and the failure's name", () => {
    setup();

    expect(screen.getByText("Structured Outputs")).toBeInTheDocument();
    expect(screen.getByText("https://gone.test/1")).toBeInTheDocument();
    expect(
      screen.getByText("https://web.archive.org/web/20240512/https://gone.test/1")
    ).toBeInTheDocument();
    // Status is never color alone: the chip carries its words.
    expect(screen.getByText("HTTP 404")).toBeInTheDocument();
    expect(screen.getByText("DNS Unreachable")).toBeInTheDocument();
  });

  it("keeps a link without a snapshot on screen, with nothing to apply", () => {
    setup({ proposalUrls: {} });

    // Both rows report the miss; neither checkbox can stage anything.
    expect(screen.getAllByText("No archived copy found")).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: "Structured Outputs" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Subgrid Patterns" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Apply Selected/ })).toBeNull();
  });

  it("starts with every snapshot accepted, so agreeing is one click", () => {
    const { onApply } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Apply Selected (1)" }));
    expect(onApply).toHaveBeenCalledWith(["1"]);
  });

  it("applies only the rows still ticked", () => {
    const { onApply } = setup({
      proposalUrls: {
        1: "https://web.archive.org/web/20240512/https://gone.test/1",
        2: "https://web.archive.org/web/20240201/https://gone.test/2",
      },
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "Structured Outputs" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply Selected (1)" }));

    expect(onApply).toHaveBeenCalledWith(["2"]);
  });

  it("cannot be changed while an apply is in flight", () => {
    setup({ applying: true });

    expect(screen.getByRole("checkbox", { name: "Structured Outputs" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apply Selected (1)" })).toBeDisabled();
  });

  it("shows the app's rejections as unticked rows, with nothing to apply", () => {
    setup({ rejectedIds: new Set(["1"]) });

    expect(screen.getByRole("checkbox", { name: "Structured Outputs" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Apply Selected (0)" })).toBeDisabled();
  });
});

// #303 (codex): the freshness line reads a clock that moves on without the
// reader — a view left open advances its words at the exact boundary they
// turn over, and sits still between boundaries.
describe("LinkHealthView's freshness clock (#303)", () => {
  it("advances the line when the minute it was showing runs out", () => {
    vi.useFakeTimers();
    setup({ lastSweepAt: Date.now() });

    expect(screen.getByText("Last scan just now")).toBeInTheDocument();

    // Past the minute boundary (and the scheduler's one-second floor): the
    // words move without a single user interaction.
    act(() => {
      vi.advanceTimersByTime(61_000);
    });

    expect(screen.getByText("Last scan 1 minute ago")).toBeInTheDocument();
  });

  it("leaves an hour-old line alone until its hour is up", () => {
    vi.useFakeTimers();
    setup({ lastSweepAt: Date.now() - 2 * 60 * 60 * 1000 });

    // Fifty-nine minutes in: the label's hour bucket still holds; nothing
    // has fired to re-render it.
    act(() => {
      vi.advanceTimersByTime(59 * 60_000);
    });
    expect(screen.getByText("Last scan 2 hours ago")).toBeInTheDocument();

    // Past the hour boundary the timer was set for: the words turn over.
    act(() => {
      vi.advanceTimersByTime(61 * 1000);
    });
    expect(screen.getByText("Last scan 3 hours ago")).toBeInTheDocument();
  });

  it("sits still when no sweep has ever run", () => {
    vi.useFakeTimers();
    setup({ lastSweepAt: null });

    act(() => {
      vi.advanceTimersByTime(10 * 60_000);
    });

    expect(screen.queryByText(/Last scan/)).toBeNull();
  });
});

// #303: every card can act on its own — the ordinary edit form, and a
// one-row ask of the archive that replaces the batch-only toolbar way.
describe("LinkHealthView's per-card actions (#303)", () => {
  it("opens the edit form for the one link the card names", () => {
    const { onEdit } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Edit the URL of Structured Outputs" }));
    expect(onEdit).toHaveBeenCalledWith(broken[0]);
  });

  it("offers Wayback only where no snapshot is staged, and asks about that row alone", () => {
    const { onWayback } = setup();

    // Row 1 has its snapshot; only row 2 still wants asking.
    expect(
      screen.queryByRole("button", { name: "Find an archived copy of Structured Outputs" })
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Find an archived copy of Subgrid Patterns" })
    );
    expect(onWayback).toHaveBeenCalledWith(broken[1]);
  });

  it("holds Wayback still while a lookup runs", () => {
    setup({ proposalUrls: {}, archiveRunning: true });

    expect(
      screen.getByRole("button", { name: "Find an archived copy of Structured Outputs" })
    ).toBeDisabled();
  });

  it("holds Wayback still while an apply is in flight", () => {
    setup({ proposalUrls: {}, applying: true });

    expect(
      screen.getByRole("button", { name: "Find an archived copy of Structured Outputs" })
    ).toBeDisabled();
  });

  it("hands each card its named action pair", () => {
    setup({ proposalUrls: {} });

    expect(screen.getAllByRole("group", { name: "This card's actions" })).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Edit the URL of Subgrid Patterns" })
    ).toBeInTheDocument();
  });
});

// #303: below `lg` the same view presents as the mobile mockup's full-page
// sheet — the bar's back and re-check over the flagged count and freshness,
// the banner, the same rows, and the write in the footer.
describe("LinkHealthSheet, the view below `lg` (#303)", () => {
  it("trades the workspace header for the app bar, and keeps the rows", () => {
    setup({ belowLg: true });

    expect(screen.getByRole("heading", { name: "Broken Links" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Link Health & Archive Recovery" })).toBeNull();
    expect(screen.getByText("2 flagged · Last scan 2 hours ago")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to bookmarks" })).toBeInTheDocument();
    expect(screen.getByText("https://gone.test/1")).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: "This card's actions" })).toHaveLength(2);
  });

  it("backs out through the bar and through Escape, and only then", () => {
    const { onClose } = setup({ belowLg: true });

    fireEvent.click(screen.getByRole("button", { name: "Back to bookmarks" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Broken Links" }), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("re-checks from the bar", () => {
    const { onRecheck } = setup({ belowLg: true });

    fireEvent.click(screen.getByRole("button", { name: "Re-check Links" }));
    expect(onRecheck).toHaveBeenCalledTimes(1);
  });

  it("gives the bar's seat to Stop while a sweep runs", () => {
    const { onStopSweep } = setup({
      belowLg: true,
      sweepRunning: true,
      sweepChecked: 1,
      sweepTotal: 4,
    });

    expect(screen.queryByRole("button", { name: "Re-check Links" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStopSweep).toHaveBeenCalledTimes(1);
  });

  it("writes from the footer, and asks the archive from there too when a lookup is owed", () => {
    const { onApply, onFindSnapshots } = setup({ belowLg: true });

    fireEvent.click(screen.getByRole("button", { name: "Find Archive Snapshots" }));
    expect(onFindSnapshots).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Apply Selected (1)" }));
    expect(onApply).toHaveBeenCalledWith(["1"]);
  });

  it("keeps the per-card actions, and drops Apply from the footer when nothing is proposed", () => {
    setup({ belowLg: true, proposalUrls: {}, needsLookup: false });

    fireEvent.click(screen.getByRole("button", { name: "Edit the URL of Structured Outputs" }));
    expect(screen.queryByRole("button", { name: /Apply Selected/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Find an archived copy of Structured Outputs" })
    ).toBeEnabled();
  });
});
