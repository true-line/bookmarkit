---
"bookmarkit": minor
---

Migrate the change-review dialog to the unified design system

ChangeReviewModal — the diff dialog every proposed change is reviewed through (AI organize, broken-link archive copies) — now renders the design system's modal-standard shell at the duplicate-review mockup's wide 2xl reading: a divided header carrying the explainer as the body-sm description, proposal rows as `ui-card` compositions whose tags render `ui-tag` chips (a gained tag wears the screens' tertiary reading), raw URL values pinned LTR in `ui-url`, and a footer with the live selection count beside the canonical intents — the bulk accept toggle and Cancel on secondary, Apply on primary. The review contract is unchanged: every row starts accepted, rows drop individually, and nothing writes until Apply.
