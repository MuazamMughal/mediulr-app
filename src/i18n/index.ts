import { createFormat, createTranslator, isRtlLocale, type Format, type Locale } from "./core";
import { en } from "./en";
import { ur } from "./ur";

export type MessageKey = keyof typeof en;
/** "home.doses" for the pair "home.doses_one" / "home.doses_other". */
type PluralBase<K> = K extends `${infer B}_other` ? B : never;
export type PluralKey = PluralBase<MessageKey>;

const dictionaries: Record<Locale, Record<string, string>> = { en, ur };

export interface I18n {
  locale: Locale;
  isRTL: boolean;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  tn: (key: PluralKey, count: number, params?: Record<string, string | number>) => string;
  fmt: Format;
}

export function createI18n(locale: Locale): I18n {
  const { t, tn } = createTranslator(locale, dictionaries[locale], dictionaries.en);
  return { locale, isRTL: isRtlLocale(locale), t, tn, fmt: createFormat(locale) };
}

// Code outside React (notification text, error messages) reads the language chosen most recently.
let current: I18n = createI18n("en");
export function setCurrentLocale(locale: Locale): void {
  if (current.locale !== locale) current = createI18n(locale);
}
export const getI18n = (): I18n => current;

export { en, ur };
export type { Locale, Format };
