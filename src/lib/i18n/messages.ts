import en from "./locales/en.json";
import es from "./locales/es.json";

/**
 * Lightweight, dependency-free i18n layer.
 *
 * UI labels live in per-language JSON files under `locales/` that share an
 * identical key set. `en.json` is the canonical source of truth for keys, and
 * every other locale is typed against it so a missing translation becomes a
 * compile-time error (see {@link messages}).
 *
 * To add a string:
 * 1. Add the key + English text to `locales/en.json`.
 * 2. Translate the same key in every other locale file.
 *    TypeScript flags any file that is missing the new key.
 */

/** All locales the app ships with. The first entry is treated as canonical. */
export const LOCALES = ["en", "es"] as const;

/** A supported locale code (e.g. `"en"`). Derived from {@link LOCALES}. */
export type Locale = (typeof LOCALES)[number];

/** Human-readable names for each locale, used in the language switcher UI. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

/** Locale used during SSR/first paint and as the translation fallback. */
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Every valid translation key, derived from the canonical `en.json` file.
 * Adding/removing a key in `en.json` automatically updates this union.
 */
export type MessageKey = keyof typeof en;

/** A complete dictionary: every {@link MessageKey} mapped to its string. */
export type Messages = Record<MessageKey, string>;

/**
 * The assembled translation map.
 *
 * Typed as `Record<Locale, Messages>`, so if any locale JSON file is missing a
 * key present in `en.json`, this assignment fails type-checking.
 */
export const messages: Record<Locale, Messages> = {
  en,
  es,
};
