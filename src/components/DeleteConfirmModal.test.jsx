import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import DeleteConfirmModal from "./DeleteConfirmModal.jsx";

const setup = (overrides = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <DeleteConfirmModal
      message="Are you sure you want to delete 2 bookmark(s)?"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />
  );
  return { onConfirm, onCancel };
};

const reasons = [
  {
    id: "syndicated",
    title: "Rust ownership, explained",
    keptTitle: "Rust ownership explained",
    reason: "syndicated copy of the same article",
  },
];

describe("DeleteConfirmModal", () => {
  // #243: the destructive reading of the unified modal — standard panel with a
  // filled-danger confirm and the tonal bordered Cancel. The question rides
  // the header description, which the unified modal wires into the dialog's
  // aria-describedby: the legacy modal described the dialog with this message
  // and the migration must not drop that.
  it("renders the unified modal with the destructive footer recipe", () => {
    setup();

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass("ui-modal-panel");
    expect(panel).toHaveAttribute("aria-modal", "true");

    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toHaveClass("ui-button--secondary");
    const confirm = screen.getByRole("button", { name: "Delete" });
    expect(confirm).toHaveClass("ui-button--destructive");
  });

  it("describes the dialog with the question it asks", () => {
    setup({ message: "Are you sure you want to delete 2 bookmark(s)?" });

    const describedBy = screen.getByRole("dialog").getAttribute("aria-describedby");
    expect(document.getElementById(describedBy)).toHaveTextContent(
      "Are you sure you want to delete 2 bookmark(s)?"
    );
  });

  it("asks before deleting, and reports which way the user went", () => {
    const { onConfirm, onCancel } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  // #86: a proposal the user did not make by hand has to explain itself.
  it("shows why each proposed pair was called the same page", () => {
    setup({ reasons });

    expect(screen.getByText("Rust ownership, explained")).toBeInTheDocument();
    expect(screen.getByText("Rust ownership explained")).toBeInTheDocument();
    expect(screen.getByText("syndicated copy of the same article")).toBeInTheDocument();
  });

  it("stays plain for a deletion that needs no explaining", () => {
    setup();

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("cannot be abandoned half way through a deletion", () => {
    const { onCancel } = setup({ isLoading: true });

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
