---
"bookmarkit": patch
---

Options no longer shows a 403 when opened before an API key exists.

Endpoint-driven discovery (#225) made the model list load on open fire a real request. For a hosted provider with no key yet, that request could only come back refused — Gemini answers 403 — so entering Options read as an error before anything was configured. The picker now waits for a key on hosted providers and lists keylessly as before on local servers; the typed-id field and its guidance stay available in the meantime.
