#!/usr/bin/env node

// Generate the attribution file for the production npm dependency closure.
// Package selection comes from package-lock.json so it is deterministic across
// machines. License metadata and texts come from the exact installed packages;
// run npm ci before this script.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK_PATH = path.join(ROOT, "package-lock.json");
const NODE_MODULES_PATH = path.join(ROOT, "node_modules");
const NOTICES_PATH = path.join(ROOT, "THIRD-PARTY-NOTICES.md");
const LICENSE_FILE_PATTERN = /^(?:licen[cs]e|copying|notice|unlicense)(?:[.-].*)?$/iu;

function byCodepoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function packageNameFromLockKey(key) {
  return key.slice(key.lastIndexOf("node_modules/") + "node_modules/".length);
}

function readPackageManifest(directory) {
  try {
    return JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

function declaredLicense(entry, manifest) {
  const value = entry.license ?? manifest?.license ?? manifest?.licenses;
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value.type === "string") return value.type;
  if (Array.isArray(value) && value.length > 0) {
    return value.map((item) => (typeof item === "string" ? item : item.type)).join(" OR ");
  }
  return "UNKNOWN";
}

function readLicenseTexts(directory) {
  let names;
  try {
    names = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && LICENSE_FILE_PATTERN.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => byCodepoint(a.toLowerCase(), b.toLowerCase()));
  } catch {
    return [];
  }

  return names.map((name) => ({
    name,
    text: readFileSync(path.join(directory, name), "utf8")
      .replaceAll("\r\n", "\n")
      .replace(/[ \t]+$/gmu, "")
      .trim(),
  }));
}

function productionPackages() {
  if (!existsSync(NODE_MODULES_PATH)) {
    throw new Error("node_modules is missing; run `npm ci` before generating notices.");
  }

  const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
  const found = new Map();

  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    if (!key.startsWith("node_modules/") || entry.dev === true || entry.link === true) continue;

    const name = packageNameFromLockKey(key);
    const version = entry.version ?? "0.0.0";
    const directory = path.join(ROOT, key);
    const conditional =
      entry.optional === true || Array.isArray(entry.os) || Array.isArray(entry.cpu);
    const manifest = conditional ? null : readPackageManifest(directory);
    if (!conditional && manifest === null) {
      throw new Error(
        `Installed production package is missing: ${name}@${version}. Run \`npm ci\`.`
      );
    }

    found.set(`${name}@${version}`, {
      name,
      version,
      license: declaredLicense(entry, manifest),
      conditional,
      licenseTexts: conditional ? [] : readLicenseTexts(directory),
    });
  }

  return [...found.values()].sort(
    (a, b) => byCodepoint(a.name, b.name) || byCodepoint(a.version, b.version)
  );
}

function render(packages) {
  const summary = packages
    .map(({ name, version, license }) => `| \`${name}\` | ${version} | ${license} |`)
    .join("\n");

  const details = packages
    .map((pkg) => {
      const body = pkg.licenseTexts.length
        ? pkg.licenseTexts
            .map(({ name, text }) => `### ${name}\n\n\`\`\`text\n${text}\n\`\`\``)
            .join("\n\n")
        : pkg.conditional
          ? "_Conditional package; its license text ships with the platform build that installs it._"
          : "_No license or notice text file was present in the published package._";
      return `## ${pkg.name} ${pkg.version}\n\nLicense: ${pkg.license}\n\n${body}`;
    })
    .join("\n\n---\n\n");

  return `# Third-Party Notices

BookmarkIt bundles the production npm packages listed below in its web and
Chrome-extension builds. Each package remains under its own license.

This file is generated from \`package-lock.json\` and the installed package
contents. Do not edit it by hand. Run \`npm run licenses:notices\` after
changing production dependencies; CI checks that the committed output is
current.

## Summary

| Package | Version | License |
| --- | --- | --- |
${summary}

---

${details}
`;
}

function main() {
  const packages = productionPackages();
  const output = render(packages);

  if (process.argv.includes("--check")) {
    const current = existsSync(NOTICES_PATH) ? readFileSync(NOTICES_PATH, "utf8") : null;
    if (current !== output) {
      console.error(
        `THIRD-PARTY-NOTICES.md is stale (expected ${packages.length} packages). Run \`npm run licenses:notices\`.`
      );
      process.exitCode = 1;
      return;
    }
    console.log(`THIRD-PARTY-NOTICES.md is current (${packages.length} packages).`);
    return;
  }

  writeFileSync(NOTICES_PATH, output);
  console.log(`Wrote THIRD-PARTY-NOTICES.md for ${packages.length} packages.`);
}

main();
