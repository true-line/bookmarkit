---
"bookmarkit": patch
---

Local LLM providers (Ollama, LM Studio) no longer get the "API key is missing" error when a natural-language search or organize run fails. Those providers have no API key field and need no key: an HTTP 401/403 from them is now reported as the server refusing the request (pointing at `OLLAMA_ORIGINS` or LM Studio's CORS setting), and an unreachable local server is reported as such instead of an internet-connection problem. An organize run stops at the first slice a local server refuses or cannot serve, showing that guidance, instead of silently working through every remaining slice. Hosted providers' messages are unchanged.
