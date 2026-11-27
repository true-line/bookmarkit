---
"bookmarkit": patch
---

The Options status pill now verifies the provider instead of trusting the toggle: besides the asks' readiness rule (#349), the staged configuration needs a chosen model, a well-formed endpoint, and the modal's own model-list probe concluded for exactly the staged options. An unreachable local server, a refused key, or a half-finished configuration reads "Provider unavailable" or stays neutral — it can no longer show an active provider that cannot actually serve a request. While the probe is concluding, the pill reads "Checking provider…", and a locked session keeps its neutral dot as well as its label.
