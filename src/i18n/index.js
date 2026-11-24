// The read side of the UI message catalogue (#284): MessageProvider and the
// useMessages() hook. Works with no provider — the default locale is "en"
// regardless of the browser's, because the app ships one UI language until an
// interface-language selector lands. A locale that lacks a key falls back to
// the English message, then to the key string itself.
//
// The returned `t` is a function with attached formatters:
//   t("filter.anyRating")                    — plain message
//   t("bulkEdit.applyTo", { count })         — placeholders; numbers are
//                                              Intl.NumberFormat-formatted
//   t("linkSweep.brokenLinks", { count })    — plural message ({ one, other })
//   t.rich("help.tipsDuplicates")            — the same message as React nodes:
//                                              <strong>/<em> become elements
//   t.rich("linkSweep.brokenLinks", { chip })  — and a slot may carry a node
//   t.count(n), t.date(d, opts), t.relative(n, unit, opts)
//
// `t` is stable across renders for a given locale, so it is safe in
// useMemo/useCallback/useEffect dependency arrays and does not disturb
// React.memo comparisons. Call useMessages() at the top level of a component,
// never in loops, conditions, event handlers or module scope. Code that is not
// a component's render — a hook's callback, a utility — calls getMessages()
// at the moment it needs a message instead.

import React, { createContext, useContext, useEffect, useMemo } from "react";
import {
  formatDate,
  formatMessage,
  formatNumber,
  formatRelativeTime,
  interpolate,
  segmentsToText,
  selectPluralForm,
} from "./format.js";
import en from "./messages/en.js";

const DEFAULT_LOCALE = "en";

const MessageContext = createContext(null);

/** Look a dotted key ("filter.tagHint.include") up in a catalogue nested by surface. */
const lookup = (messages, key) => {
  if (!messages) return undefined;
  let node = messages;
  for (const part of key.split(".")) {
    node = node?.[part];
    if (node === undefined) return undefined;
  }
  return node;
};

const warned = new Set();

// Dev/test-only: a key missing from every catalogue renders as the key string,
// so a silent one-time note beats an invisible gap. Production builds stay quiet.
const warnMissing = (key, locale) => {
  if (!import.meta.env?.DEV) return;
  const stamp = `${locale}:${key}`;
  if (warned.has(stamp)) return;
  warned.add(stamp);
  console.warn(`[i18n] No message for "${key}" (locale "${locale}").`);
};

// Segments as React children. `strong`/`em` become elements; a slot's node
// keeps its place in the sentence; strings that run on are merged, so the page
// reads exactly as it did before the catalogue.
const toNodes = (segments) =>
  segments.reduce((nodes, segment, index) => {
    let node;
    if (typeof segment === "string") node = segment;
    else if (segment.tag) {
      node = React.createElement(segment.tag, { key: index }, ...toNodes(segment.children));
    } else if (React.isValidElement(segment.value)) {
      node = React.cloneElement(segment.value, { key: index });
    } else {
      node = segmentsToText([segment]);
    }
    if (typeof node === "string" && typeof nodes[nodes.length - 1] === "string") {
      nodes[nodes.length - 1] += node;
      return nodes;
    }
    nodes.push(node);
    return nodes;
  }, []);

/**
 * The translator for one locale and catalogue. Exported for code that renders
 * outside a component (a utility that builds a sentence) and for tests;
 * components take it from useMessages().
 */
export function createTranslator(locale, messages) {
  // The template behind a key: the locale's message, the English one, or —
  // for a plural message — the form the count picks. A key missing from every
  // catalogue is its own text.
  const templateFor = (key, params) => {
    const message = lookup(messages, key) ?? lookup(en, key);
    if (message === undefined) {
      warnMissing(key, locale);
      return key;
    }
    if (typeof message === "string") return message;
    const template = selectPluralForm(message, params.count ?? 0, locale);
    if (typeof template !== "string") {
      warnMissing(key, locale);
      return key;
    }
    return template;
  };

  const t = (key, params = {}) => formatMessage(templateFor(key, params), params, locale);
  // A message that carries emphasis, or a slot that carries markup (a chip
  // around a count, a key cap, a styled span). The sentence still lives in the
  // catalogue as one template, in the translator's word order.
  t.rich = (key, params = {}) => {
    const template = templateFor(key, params);
    return template === key ? template : toNodes(interpolate(template, params, locale));
  };
  t.locale = locale;
  // What this translator reads, so a provider can tell its own from another's.
  t.messages = messages;
  // Counts and dates rendered outside a sentence (a chip, a column) use the
  // same locale the messages do.
  t.count = (value) => formatNumber(value, locale);
  t.date = (value, options) => formatDate(value, options, locale);
  t.relative = (value, unit, options) => formatRelativeTime(value, unit, options, locale);
  return t;
}

// #307: The translator for code that runs outside a component's render — a
// hook's callback, a utility, the LLM error classifier — where useMessages()
// cannot be called. MessageProvider publishes its translator here as it
// renders, so everything under it resolves against the same locale and
// catalogue the components do; with no provider it is the default locale.
//
// It is read when a message is raised, never captured at module load, so a
// message raised after the locale changed reads in the new locale. It stays
// unmounts, which hands back to English. Nothing in the app mounts a provider
// yet, so in practice it is English until a language selector does; nested
// providers are not a supported shape, and an inner one does not restore its
// outer one when it goes.
let current = null;

/** The translator in effect outside React's tree. See the note above. */
export function getMessages() {
  current ??= createTranslator(DEFAULT_LOCALE, undefined);
  return current;
}

export function MessageProvider({ locale = DEFAULT_LOCALE, messages, children }) {
  // Publishing happens here rather than in an effect on purpose: children's
  // effects run before their parent's, so a child raising a message in its
  // own effect would otherwise still read the previous locale.
  const value = useMemo(() => {
    const translator = createTranslator(locale, messages);
    current = translator;
    return { locale, messages, translator };
  }, [locale, messages]);
  // Taking it back waits for the effect, since a render that is discarded
  // must not. The assignment covers an effect that StrictMode runs twice.
  useEffect(() => {
    current = value.translator;
    return () => {
      if (current === value.translator) current = null;
    };
  }, [value]);
  // createElement rather than JSX: this module keeps a .js extension (no
  // JSX transform), and a one-element provider loses nothing by it.
  return React.createElement(MessageContext.Provider, { value }, children);
}

export function useMessages() {
  const context = useContext(MessageContext);
  const locale = context?.locale ?? DEFAULT_LOCALE;
  const messages = context?.messages;
  // Stable identity per locale/messages: one translator object, memoized, so
  // consumer memoization and React.memo boundaries see the same `t`.
  return useMemo(() => createTranslator(locale, messages), [locale, messages]);
}
