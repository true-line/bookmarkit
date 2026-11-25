import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import LinkHealthView from "./LinkHealthView.jsx";

// #295: the view is the broken-links mockup's page — summary, re-check, and
// the archive's proposals reviewed in place. The pieces it reads are tested
// beside their modules (linkHealth, archiveRecovery, useLinkSweep); these pin
// the view's own contract: the review stance it shares with the dialog
// (everything starts accepted, unticking is the disagreement, nothing writes
// until Apply Selected), the chip that carries its words with its color, and
// the two asked-for network steps stopping when told to.

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
  const handlers = {
    onRecheck: vi.fn(),
    onStopSweep: vi.fn(),
    onFindSnapshots: vi.fn(),
    onStopArchive: vi.fn(),
    onApply: vi.fn(),
  };
  render(
    <LinkHealthView
      checkedTotal={1024}
      unreachableCount={broken.length}
      broken={broken}
      proposalUrls={snapshots}
      {...handlers}
      {...over}
    />
  );
  return handlers;
};

describe("LinkHealthView's summary and actions (#295)", () => {
  it("says how many links were checked and how many are unreachable", () => {
    setup();

    expect(screen.getByText("1,024 checked · 2 unreachable")).toBeInTheDocument();
    expect(
      screen.getByText("Recovery proposes snapshot URLs without overwriting automatically.")
    ).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStopArchive).toHaveBeenCalledTimes(1);
  });

  it("asks the archive while any dead link still has no snapshot", () => {
    const { onFindSnapshots } = setup({ proposalUrls: {} });

    fireEvent.click(screen.getByRole("button", { name: "Find Archive Snapshots" }));
    expect(onFindSnapshots).toHaveBeenCalledTimes(1);
  });

  it("offers nothing to ask about once every dead link has a snapshot", () => {
    setup({
      proposalUrls: {
        1: "https://web.archive.org/web/20240512/https://gone.test/1",
        2: "https://web.archive.org/web/20240201/https://gone.test/2",
      },
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
});
