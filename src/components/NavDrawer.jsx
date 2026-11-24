// #294: The navigation drawer — the mobile manager's slide-over
// (design/mockups/bookmarkit_mobile_manager/code.html 390–484). Below `lg`,
// where the fixed rail has no room, it is the way in to the same navigation.
//
// It is the design system's drawer and nothing more: a modal dialog over the
// spec's scrim with the focus trap, Escape and focus restoration every other
// dialog in the app has (Modal, variant "drawer"). The content is the sidebar
// rail itself, so the two can never drift apart, with a close control added.
// BookmarkApp makes the header and the list `inert` while it is open.

import React from "react";
import { Modal } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import SidebarNav from "./SidebarNav.jsx";

/** The drawer panel's id, for the menu button's aria-controls. */
export const NAV_DRAWER_ID = "bookmarkit-nav-drawer";

const NavDrawer = React.memo(function NavDrawer({ onClose, ...nav }) {
  const t = useMessages();

  return (
    // No heading of its own: the rail's brand row is the drawer's, and it
    // carries the close control. The panel is still named — by the same label
    // the rail has.
    <Modal
      variant="drawer"
      id={NAV_DRAWER_ID}
      aria-label={t("sidebar.navLabel")}
      className="ui-nav-drawer"
      onClose={onClose}
      hideClose
    >
      <SidebarNav {...nav} onClose={onClose} className="ui-sidebar--drawer" />
    </Modal>
  );
});

export default NavDrawer;
