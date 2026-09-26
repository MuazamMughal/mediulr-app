/**
 * Language support, kept free of any UI code so it can be tested on its own.
 * Adding a language = a new dictionary file, an entry in LOCALES, and a formatter below.
 */
export type Locale = "en" | "ur";
export type LanguagePref = "system" | Locale;

export const LOCALES: readonly { code: Locale; name: string; rtl: boolean }[] = [
  { code: "en", name: "English", rtl: false },
  { code: "ur", name: "اردو", rtl: true },
];

export const isRtlLocale = (locale: Locale): boolean => LOCALES.find((l) => l.code === locale)?.rtl ?? false;

/**
 * The language to show: the person's own choice, or — for "system" — the first of the device's languages we support
 * (a Pakistani phone set to Urdu gets Urdu; anything else falls back to English).
 */
export function resolveLocale(pref: LanguagePref, deviceLanguages: string[]): Locale {
  if (pref !== "system") return pref;
  for (const tag of deviceLanguages) {
    const code = tag.toLowerCase().split(/[-_]/)[0];
    const match = LOCALES.find((l) => l.code === code);
    if (match) return match.code;
  }
  return "en";
}

/** Replaces `{name}` placeholders. A placeholder with no value is left as-is so the gap is visible, not silent. */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in params ? String(params[key]) : whole));
}

/** English and Urdu both distinguish just "one" and "other". */
export function pluralForm(_locale: Locale, count: number): "one" | "other" {
  return count === 1 ? "one" : "other";
}

export type Messages = Record<string, string>;

export interface Translator {
  /** Look up a message. Falls back to English, then to the key itself, so a missing string never crashes a screen. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Plural-aware lookup: uses `${key}_one` / `${key}_other`. `{count}` is filled in automatically. */
  tn: (key: string, count: number, params?: Record<string, string | number>) => string;
}

export function createTranslator(locale: Locale, messages: Messages, fallback: Messages): Translator {
  const lookup = (key: string) => messages[key] ?? fallback[key] ?? key;
  return {
    t: (key, params) => interpolate(lookup(key), params),
    tn: (key, count, params) => {
      const form = pluralForm(locale, count);
      const template = messages[`${key}_${form}`] ?? messages[`${key}_other`] ?? fallback[`${key}_${form}`] ?? fallback[`${key}_other`] ?? key;
      return interpolate(template, { count, ...params });
    },
  };
}

// ── date and time wording ─────────────────────────────────────────────────────────────────────────
export interface TimeOfDay {
  hour: number; // 0–23
  minute: number; // 0–59
}

export interface Format {
  /** 0 = Sunday, matching `Date.getDay()`. */
  weekdayName: (dayIndex: number, style: "long" | "short" | "narrow") => string;
  weekdayOf: (d: Date) => string; // "Saturday"
  dayFull: (d: Date) => string; // "Saturday, September 26"
  dayShort: (d: Date) => string; // "Tue, Sep 22"
  monthDay: (d: Date) => string; // "September 26"
  monthDayShort: (d: Date) => string; // "Sep 26"
  monthShort: (d: Date) => string; // "Sep"
  monthYear: (d: Date) => string; // "September 2026"
  dateMedium: (d: Date) => string; // "Sep 26, 2026"
  dateFull: (d: Date) => string; // "Saturday, September 26, 2026"
  dateTimeMedium: (d: Date) => string; // "Sep 26, 2026, 10:00 AM"
  /** A clock time in the device's own style for English (12 or 24 hour), the app's 12-hour style for Urdu. */
  time: (d: Date) => string;
  /** The 12-hour wording the in-app time picker uses: "8:05 AM". */
  clock: (t: TimeOfDay) => string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const hour12Of = (h: number) => (h % 12 === 0 ? 12 : h % 12);

function englishFormat(): Format {
  const intl = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(undefined, o);
  return {
    weekdayName: (i, style) => new Date(2024, 0, 7 + i).toLocaleDateString(undefined, { weekday: style }), // 7 Jan 2024 is a Sunday
    weekdayOf: (d) => intl(d, { weekday: "long" }),
    dayFull: (d) => intl(d, { weekday: "long", month: "long", day: "numeric" }),
    dayShort: (d) => intl(d, { weekday: "short", month: "short", day: "numeric" }),
    monthDay: (d) => intl(d, { month: "long", day: "numeric" }),
    monthDayShort: (d) => intl(d, { month: "short", day: "numeric" }),
    monthShort: (d) => intl(d, { month: "short" }),
    monthYear: (d) => intl(d, { month: "long", year: "numeric" }),
    dateMedium: (d) => intl(d, { month: "short", day: "numeric", year: "numeric" }),
    dateFull: (d) => d.toLocaleDateString(undefined, { dateStyle: "full" }),
    dateTimeMedium: (d) => d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    time: (d) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    clock: ({ hour, minute }) => `${hour12Of(hour)}:${pad2(minute)} ${hour >= 12 ? "PM" : "AM"}`,
  };
}

const UR_MONTHS = ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"];
const UR_WEEKDAYS = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];
// Single-letter forms would collide (Thursday and Friday both start with ج), so the narrow style uses short names.
const UR_WEEKDAYS_SHORT = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];

/** Urdu wording is written out by hand: Android's built-in Urdu locale data is unreliable, and English month names on an Urdu screen would look broken. Digits stay Western, as most Urdu readers expect on a phone. */
function urduFormat(): Format {
  const clock = ({ hour, minute }: TimeOfDay) => `${hour12Of(hour)}:${pad2(minute)} ${hour >= 12 ? "شام" : "صبح"}`;
  const monthDay = (d: Date) => `${d.getDate()} ${UR_MONTHS[d.getMonth()]}`;
  const dateMedium = (d: Date) => `${monthDay(d)} ${d.getFullYear()}`;
  return {
    weekdayName: (i, style) => (style === "long" ? UR_WEEKDAYS[i] : UR_WEEKDAYS_SHORT[i]),
    weekdayOf: (d) => UR_WEEKDAYS[d.getDay()],
    dayFull: (d) => `${UR_WEEKDAYS[d.getDay()]}، ${monthDay(d)}`,
    dayShort: (d) => `${UR_WEEKDAYS_SHORT[d.getDay()]}، ${monthDay(d)}`,
    monthDay,
    monthDayShort: monthDay,
    monthShort: (d) => UR_MONTHS[d.getMonth()],
    monthYear: (d) => `${UR_MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    dateMedium,
    dateFull: (d) => `${UR_WEEKDAYS[d.getDay()]}، ${dateMedium(d)}`,
    dateTimeMedium: (d) => `${dateMedium(d)}، ${clock({ hour: d.getHours(), minute: d.getMinutes() })}`,
    time: (d) => clock({ hour: d.getHours(), minute: d.getMinutes() }),
    clock,
  };
}

export function createFormat(locale: Locale): Format {
  return locale === "ur" ? urduFormat() : englishFormat();
}
