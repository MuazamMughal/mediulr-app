# Languages

Mediulr speaks **English** and **Urdu (اردو)**. Urdu is right-to-left.

## For users
Settings → **Language**: *Device language* (default — an Urdu phone gets Urdu, anything else English), *English*, or *اردو*. Text changes at once. Switching to or from Urdu also changes the layout direction, which the phone applies at launch, so the app asks you to close and reopen it. (On the web preview the direction changes immediately.)

Things the person typed (medication names, notes, family names) are never translated.

## For developers
- **All wording lives in `src/i18n/en.ts`** (source of truth) **and `src/i18n/ur.ts`**. Components use `const { t, tn, fmt } = useI18n()`; code outside React uses `getI18n()`. Keys are typed, so a typo is a compile error.
- **A test (`tests/i18n.test.ts`) fails if** a key exists in English but not Urdu (or vice-versa), an Urdu message is empty, `{placeholders}` differ, or a plural lacks its `_one`/`_other` pair.
- **Plurals:** `tn("home.doses", 3)` looks up `home.doses_one` / `home.doses_other` and fills `{count}`.
- **Dates and times:** always through `fmt` (`fmt.dayFull(d)`, `fmt.time(d)`, `fmt.clock({hour, minute})`). Urdu month and weekday names are written out in `src/i18n/core.ts` because Android's built-in Urdu locale data is unreliable. Digits stay Western.
- **Pure helpers** (`describeCourse`, `refillHeadline`, `formatDuration`, `buildMissedDoseMessage`, …) take an optional translator that defaults to the current language, so they stay testable.
- **RTL:** use `marginStart/End` (never `marginLeft/Right`), `<Chevron />` for forward/back arrows, and no `letterSpacing` on text (it splits Arabic-script letters — `AppText` already strips it for Urdu).
- **Notifications** are planned in the current language and re-planned when it changes.
- **Stored values stay English** where the database holds a code (e.g. a guardian's relationship "Parent"); only the display is translated.

## Adding a language
1. Add its dictionary (`xx.ts`, typed like `ur.ts`), register it in `src/i18n/index.ts`, and add it to `LOCALES` (and its formatter in `core.ts`).
2. The parity test then tells you exactly which messages are missing.
3. Have a native speaker review medical wording before release.
