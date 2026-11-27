---
"bookmarkit": patch
---

The Options dialog's active-provider pill now applies the same readiness rule as the AI asks: with no provider configured it reads "No active provider" with a neutral dot instead of claiming a provider is active, and it flips to "Active: {provider}[ / {model}]" as soon as the staged configuration would actually run. A locked session reads "Provider locked — unlock to use" — the unlock pass-through exists to reach the unlock prompt, not as evidence that the staged provider is ready.
