import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileTopBar from "./MobileTopBar.jsx";
import { NAV_DRAWER_ID } from "./NavDrawer.jsx";

// #294: the mobile manager's top bar. It displays what it is given and calls
// the handlers it is given, so these are its wiring.

const setup = (props = {}) => {
  const handlers = { onOpenNav: vi.fn(), onAdd: vi.fn() };
  render(<MobileTopBar title="All Bookmarks" savedCount={3} {...handlers} {...props} />);
  return handlers;
};

describe("MobileTopBar (#294)", () => {
  it("names the view on screen and how many bookmarks are saved", () => {
    setup({ savedCount: 1200 });

    expect(screen.getByText("All Bookmarks")).toBeInTheDocument();
    expect(screen.getByText("1,200 saved")).toBeInTheDocument();
  });

  it("offers the navigation drawer from a menu button that points at it", () => {
    const { onOpenNav } = setup();

    const menu = screen.getByRole("button", { name: "Open navigation menu" });
    expect(menu).toHaveAttribute("aria-haspopup", "dialog");
    expect(menu).toHaveAttribute("aria-controls", NAV_DRAWER_ID);
    expect(menu).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menu);

    expect(onOpenNav).toHaveBeenCalledTimes(1);
  });

  it("says the drawer is open when it is", () => {
    setup({ navOpen: true });

    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("offers Add", () => {
    const { onAdd } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
