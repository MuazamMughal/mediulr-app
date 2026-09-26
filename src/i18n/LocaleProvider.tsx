import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Alert, I18nManager } from "react-native";
import { getLocales } from "expo-localization";
import { usePreferences } from "../features/preferences/Preferences";
import { resolveLocale, type LanguagePref } from "./core";
import { createI18n, setCurrentLocale, type I18n } from "./index";

interface LocaleContextValue extends I18n {
  languagePref: LanguagePref;
  setLanguage: (pref: LanguagePref) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Provides the translator to the whole app. The language comes from the person's choice (or the phone's), and the
 * layout direction follows it: Urdu reads right-to-left. Direction is applied by the operating system at launch,
 * so after a change the person is asked to reopen the app.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const { prefs, setPreference } = usePreferences();
  const deviceLanguages = useMemo(() => {
    try {
      return getLocales().map((l) => l.languageTag);
    } catch {
      return [];
    }
  }, []);
  const locale = resolveLocale(prefs.language, deviceLanguages);
  const i18n = useMemo(() => createI18n(locale), [locale]);
  setCurrentLocale(locale); // in render, so text built outside React (notifications) is never a language behind

  const askedRestart = useRef(false);
  useEffect(() => {
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== i18n.isRTL) {
      I18nManager.forceRTL(i18n.isRTL);
      if (!askedRestart.current) {
        askedRestart.current = true;
        Alert.alert(i18n.t("language.restartTitle"), i18n.t("language.restartBody"));
      }
    }
  }, [i18n]);

  const value = useMemo<LocaleContextValue>(
    () => ({ ...i18n, languagePref: prefs.language, setLanguage: (pref) => setPreference("language", pref) }),
    [i18n, prefs.language, setPreference]
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useI18n must be used within a LocaleProvider");
  return ctx;
}
