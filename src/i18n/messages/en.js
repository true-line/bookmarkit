// The English message catalogue (#284) — the source of truth for the
// user-visible strings of the surfaces migrated to the catalogue. Keys are
// flat and dotted ("filter.anyRating"); the object nests by surface, so the
// two spellings agree. Messages are complete templates with named
// placeholders, never concatenated partial sentences (design spec, Voice &
// Content Strategy). A plural message is a { one, other, … } object whose
// form is picked by the {count} parameter. Strings that are not prose — CSS
// classes, key names, decorative glyphs, URLs — stay in the components.
//
// The surfaces live in the grouped files beside this entry point (the whole
// catalogue in one file would break the repo's code-health line limit) and
// merge here, so consumers keep importing one default catalogue.

import { listMessages } from "./enList.js";
import { dialogMessages } from "./enDialogs.js";
import { surfaceMessages } from "./enModals.js";

export default {
  ...listMessages,
  ...dialogMessages,
  ...surfaceMessages,
};
