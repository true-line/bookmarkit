// #294: The mobile manager's top bar (design/mockups/bookmarkit_mobile_manager
// /code.html 167–190): a 44px menu button, the view on screen over its saved
// count, and Add. It is the first row of the app's fixed header, so it stays
// put while the list scrolls, and it exists only below `lg` — from there the
// navigation sidebar carries the brand and Add Bookmark.
//
// The bar only displays: the title and the count are the caller's, and every
// control is the caller's handler. Its copy is the catalogue's (#284).

import React from "react";
import { Button, IconButton, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import BrandMark from "./effects/BrandMark.jsx";
import { NAV_DRAWER_ID } from "./NavDrawer.jsx";
import { AddIcon, MenuIcon } from "./icons.jsx";

const MobileTopBar = React.memo(function MobileTopBar({
  title,
  savedCount = 0,
  onOpenNav,
  onAdd,
  navOpen = false,
  effectsEnabled = true,
  className = "",
}) {
  const t = useMessages();

  return (
    <div className={`ui-top-bar ${className}`}>
      <IconButton
        label={t("shell.openNav")}
        onClick={onOpenNav}
        aria-haspopup="dialog"
        aria-expanded={navOpen}
        aria-controls={NAV_DRAWER_ID}
      >
        <MenuIcon />
      </IconButton>

      <div className="ui-top-bar-heading">
        <BrandMark enabled={effectsEnabled} size={32} />
        <div className="min-w-0 text-start">
          <Typography variant="headline-sm" as="p" className="truncate">
            {title}
          </Typography>
          <Typography variant="label-sm" as="p" className="ui-top-bar-count truncate">
            {t("shell.saved", { count: savedCount })}
          </Typography>
        </div>
      </div>

      <Button onClick={onAdd} leadingIcon={<AddIcon />}>
        {t("shell.add")}
      </Button>
    </div>
  );
});

export default MobileTopBar;
