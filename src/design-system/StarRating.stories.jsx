import React from "react";
import { StarRating } from "./StarRating.jsx";
import { UiScope } from "./story-decorator.jsx";

// Rating input stories from the edit-bookmark screen (#289): five 36px star
// targets, the visible "N / 5" readout, filled stars in the primary role. The
// group is named statically ("Bookmark rating") and the readout is the polite
// live region, so a change announces as "4 / 5". Coarse pointers and narrow
// viewports raise the targets to 44px through the shared interaction rule.

const meta = {
  decorators: [UiScope],
  title: "Design System/Components/Rating Input",
  parameters: {
    docs: {
      description: {
        component:
          'A 0–5 rating as a radiogroup with one tab stop — arrows move the rating, stepping below one star clears it. The radiogroup carries the mockup\'s static name "Bookmark rating"; the visible "N / 5" readout announces changes politely. `buttonSemantics` trades the single tab stop for five toggle buttons (the quick-add popup), `readOnly` renders a role="img" display whose name carries the value. Stored ratings can be any value — the control clamps to 0–5 (#24).',
      },
    },
  },
};

export default meta;

export const Rated = {
  render: () => <StarRating value={4} onChange={() => {}} />,
};

export const Unrated = {
  render: () => <StarRating value={0} onChange={() => {}} />,
};

export const ToggleButtons = {
  render: () => <StarRating value={2} buttonSemantics onChange={() => {}} />,
};

export const ReadOnly = {
  render: () => <StarRating value={4} readOnly />,
};
