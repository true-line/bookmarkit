---
"bookmarkit": minor
---

Migrate the weekly digest modal to the unified design system

DigestModal now renders the design system's modal-standard shell with the
weekly-digest mockup's divided header and tinted footer band: each digest
section is a ui-Card with the mockup's headline-sm title and label-sm bookmark
count, and items show the mockup's label-lg title over a mono-sm URL. Button
intents follow the mockup's annotations — the model-powered "Triage untagged"
action wears the tertiary AI-assist accent with its sparkles icon, "Show never
opened" is secondary, and "Done" closes as the primary. Which bookmarks land in
each section and the digest's generation are unchanged — presentation only.
