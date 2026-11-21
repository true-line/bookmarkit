---
"bookmarkit": patch
---

Patch the transitive dependency chains flagged by the open Dependabot alerts:
an npm override pins `@grpc/grpc-js` to 1.14.5+ so the Firebase store's
firestore transport no longer ships the vulnerable 1.9.16 (GHSA-m9gg-hp2v-232j,
high — `getAuthContext` could return unauthorized certificates as authorized;
GHSA-f596-whhp-79r4, low). `vitest` moves to 5.1.1, past the mock-registration
code injection (GHSA-qxg6-89mg-rqv8) and its Windows traversal bypass
(GHSA-xp26-3454-mjgp). An override moves the Storybook docgen chain's `glob` to
14.0.2 (GHSA-3g3m-2fjr-6pw4), which also lifts that chain's nested `minimatch`
to 11.0.1 (GHSA-g3hv-75wg-m249). `npm audit` is clean.
