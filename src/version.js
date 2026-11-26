// #292: the legal footers' facts and targets, shared by the Help dialog and
// the options' About section. Vite inlines the package.json import at build
// time, so the extension and the web target agree without reading a manifest
// at runtime. The links point where the README's privacy section lives and at
// the generated notices file the repo commits — targets the extension is
// allowed to open (plain public https pages, opened by the browser, not
// fetched by the app).

import pkg from "../package.json";

export const APP_VERSION = pkg.version;
export const APP_LICENSE = pkg.license;

export const PRIVACY_POLICY_URL = "https://github.com/true-line/bookmarkit#privacy-and-storage";

export const LICENSES_URL =
  "https://github.com/true-line/bookmarkit/blob/main/THIRD-PARTY-NOTICES.md";
