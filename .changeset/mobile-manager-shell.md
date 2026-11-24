---
"bookmarkit": minor
---

On windows narrower than `lg`, the app now has a mobile manager shell. The header's top bar holds a menu button, the view on screen with its saved count, and **Add**; the menu button opens the navigation drawer, which holds the same smart views, saved views and folder tree as the wide-window sidebar. The drawer is a dialog: it takes focus, closes on Escape, the scrim or its close button, and returns focus to the menu button. The separate **Folders** toggle, the saved-view row above the list, and the **Add New**, **Digest** and **Help** buttons that used to sit in the header on narrower windows are gone, since the drawer carries all of them. Under 40rem every control is a 44px target and the list is a single column in every view mode.
