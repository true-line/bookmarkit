---
"bookmarkit": patch
---

Mobile layout cleanup (#151): at phone widths the header consumed 262px of a
667px screen and the filter bar another 326px.

- The header's action row is now one horizontally scrollable strip instead of
  wrapping into four or five stacked rows; it stays centered when it fits.
- The keyboard hint line is hidden below 40rem — there is no keyboard to hint
  at on a touch device.
- The filter bar's text filter takes a full-width row below 40rem and the
  discrete controls (rating, broken-only, never-opened, sort, direction)
  scroll horizontally as one strip instead of wrapping across six lines; the
  tag chips keep wrapping.
- The folder pane overlays the content area as a full-width sheet below 40rem
  instead of taking 60% of the viewport and crushing the bookmark list.
