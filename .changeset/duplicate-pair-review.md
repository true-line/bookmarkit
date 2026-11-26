---
"bookmarkit": minor
---

Duplicate removal is no longer all-or-nothing. "Remove Duplicates" now opens a review dialog — the mockup's duplicate-review screen — where every pair is a row of its own: both copies side by side, the survivor wearing the reason it survived (its tags, rating, or notes), and a provenance chip saying whether the rule caught the match or the LLM proposed it. Each pair keeps or removes on its own, the footer counts the selection live, and Remove writes only the pairs left ticked — still one store write, still one undo entry. The rule's exact-URL pairs and the model's near-duplicate pairs land in the same dialog, rule rows first, and the default selection is the same proposal the old confirm dialog made.
