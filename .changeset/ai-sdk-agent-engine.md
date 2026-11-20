---
"bookmarkit": minor
---

Run the natural-query agent engine on the Vercel AI SDK, and load model lists only from the endpoint.

The hand-rolled LLM layer (five per-provider fetch adapters, a JSON-reconstruction parser, and a retry wrapper) is replaced by the AI SDK's provider abstraction with schema-enforced plan output. Plans are still normalized against the same per-action whitelist before anything applies them, and plans still execute through the ordered pipeline unchanged.

Model pickers now show only what the configured endpoint actually serves: no provider ships default model names or canned fallback lists, so nothing displayed can silently rot. A provider without a chosen model explains itself in the app instead of failing on a request. Users who had a model selected keep it; everyone else picks one from the freshly loaded list (or types an id) the first time they open Options.

The AI SDK ships in its own load-on-demand chunk: startup cost is unchanged, and the vendor code is fetched once, locally, on the first generation call.
