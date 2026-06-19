import { useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useIsMounted } from "@/hooks/useIsMounted";
import {
  messages,
  DEFAULT_LOCALE,
  type Locale,
  type MessageKey,
} from "@/lib/i18n/messages";

/** Return shape of {@link useTranslation}. */
interface UseTranslation {
  /** Translates a {@link MessageKey} into the active locale's string. */
  t: (key: MessageKey) => string;
  /** The active locale (always {@link DEFAULT_LOCALE} until mounted). */
  locale: Locale;
  /** Persists a new active locale to the Zustand store. */
  setLocale: (locale: Locale) => void;
}

/**
 * Hook for reading translated UI labels.
 *
 * The active locale is read from the persisted Zustand store. Because that
 * value comes from `localStorage` (client only), the hook is mount-guarded via
 * {@link useIsMounted}: it returns {@link DEFAULT_LOCALE} during SSR/first paint
 * to avoid hydration mismatches, then swaps to the stored locale once mounted.
 * Expect a brief flash on load if a non-default locale is persisted.
 *
 * @example
 * ```tsx
 * const { t, locale, setLocale } = useTranslation();
 * return <h2>{t("footer.contact")}</h2>;
 * ```
 */
export const useTranslation = (): UseTranslation => {
  const isMounted = useIsMounted();
  const storedLocale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  // Render the default during SSR/first paint; swap to the stored locale
  // only after mount so server and client markup match.
  const locale: Locale = isMounted ? storedLocale : DEFAULT_LOCALE;

  const t = useCallback(
    (key: MessageKey): string => {
      // Fall back to the default dictionary if a tampered/stale localStorage
      // value yields an unknown locale.
      const dictionary = messages[locale] ?? messages[DEFAULT_LOCALE];
      return dictionary[key];
    },
    [locale]
  );

  return { t, locale, setLocale };
};
