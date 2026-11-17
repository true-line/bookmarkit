---
"bookmarkit": patch
---

Narrow the extension's host permissions from `<all_urls>` to `http://*/*` and `https://*/*`, exactly the two schemes URL checks can ever target. Behavior is unchanged: the same install-time warning applies, and the public-HTTP(S) fetch boundary in the service worker is untouched.
