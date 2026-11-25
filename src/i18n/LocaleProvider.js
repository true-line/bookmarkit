// The locale's state, persistence and DOM stamping (#298): LocaleProvider and
// useLocale(). The provider is also where the message catalogue mounts — it
// wraps MessageProvider with the resolved locale, so useMessages(),
// getMessages() and the formatters all read the language the selector chose.

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, LOCALES, SYSTEM_LOCALE, dirFor, resolveLocale } from "./locales.js";
import { MessageProvider } from "./index.js";
import en from "./messages/en.js";

// The same dual path as the theme (useTheme): chrome.storage.local in the
// extension, localStorage on the web.
const STORAGE_KEY = "bm_locale";

// Catalogues keyed by locale code. A registry entry without an entry here
// renders the English messages in its own number and date formats until its
// catalogue lands.
const CATALOGUES = { en };

async function readStoredChoice() {
  try {
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.local.get([STORAGE_KEY]);
      return result[STORAGE_KEY];
    }
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return undefined;
  }
}

async function writeStoredChoice(choice) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage) {
      await chrome.storage.local.set({ [STORAGE_KEY]: choice });
    } else {
      localStorage.setItem(STORAGE_KEY, choice);
    }
  } catch {}
}

const LocaleContext = createContext(null);

export function LocaleProvider({ children, locales = LOCALES }) {
  const [choice, setChoice] = useState(SYSTEM_LOCALE);

  // The persisted choice arrives one tick late; with only English shipped
  // that is invisible, and a stored RTL locale would repaint within the
  // first paint cycle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await readStoredChoice();
      // A choice is honored only while it names a real entry ("system" or a
      // shipped code) — a stale code must not leave the select showing a
      // value its options do not carry.
      if (cancelled || !stored) return;
      if (stored === SYSTEM_LOCALE || locales.some((locale) => locale.code === stored)) {
        setChoice(stored);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locales]);

  const locale = useMemo(
    () =>
      resolveLocale(choice, locales, typeof navigator !== "undefined" ? navigator.languages : []),
    [choice, locales]
  );

  // The root stamping is the whole direction contract: `dir` on the document
  // element flips every logical property in the design system at once, and
  // `lang` keeps native selects, hyphenation and screen readers on the
  // language the messages are in. The attributes the document shipped with
  // are put back on unmount, so an unmounted app leaves no residue.
  useEffect(() => {
    const root = document.documentElement;
    const previous = { dir: root.getAttribute("dir"), lang: root.getAttribute("lang") };
    root.setAttribute("dir", dirFor(locale));
    root.setAttribute("lang", locale);
    return () => {
      if (previous.dir === null) root.removeAttribute("dir");
      else root.setAttribute("dir", previous.dir);
      if (previous.lang === null) root.removeAttribute("lang");
      else root.setAttribute("lang", previous.lang);
    };
  }, [locale]);

  const value = useMemo(
    () => ({
      choice,
      locale,
      locales,
      dir: dirFor(locale),
      setLocale: (next) => {
        setChoice(next);
        writeStoredChoice(next);
      },
    }),
    [choice, locale, locales]
  );

  // createElement rather than JSX: this module keeps a .js extension (no
  // JSX transform), like the provider it wraps.
  return React.createElement(
    LocaleContext.Provider,
    { value },
    React.createElement(MessageProvider, { locale, messages: CATALOGUES[locale] }, children)
  );
}

// The selector's view of the locale state. Works with no provider — the
// system choice over the shipped registry — exactly like useMessages(), so a
// surface renders the same before the app root's provider arrives.
export function useLocale() {
  const context = useContext(LocaleContext);
  return (
    context ?? {
      choice: SYSTEM_LOCALE,
      locale: DEFAULT_LOCALE,
      locales: LOCALES,
      dir: dirFor(DEFAULT_LOCALE),
      setLocale: () => {},
    }
  );
}
