# Languages

Last reviewed: **2026-09-27**. The app supports **English** and **Urdu (اردو)**, including translated interface text and notification wording. User-entered names and notes remain as typed.

## Choosing a language

Settings → Language offers Device language, English, and Urdu. The default is Device language: the resolver checks the device's preferred languages in order, chooses the first supported English/Urdu code, and falls back to English if neither is present.

Preferences are stored locally under `mediulr:preferences`; they are not synced to Supabase or cleared on sign-out. Device language tags are read when the locale provider mounts, so reopening may be needed after changing system preferences.

Text switches immediately. On native platforms, changing between LTR and RTL calls `I18nManager.forceRTL` and asks the user to close and reopen the app to apply direction. Web changes `document.documentElement.dir` and `lang` immediately. Native controls/layout still need device QA after restart.

## Implementation map

| File | Responsibility |
|---|---|
| `src/i18n/en.ts` | English messages and source of typed message keys |
| `src/i18n/ur.ts` | Urdu equivalents |
| `src/i18n/core.ts` | Locale choice, interpolation, plurals, date/time formatting |
| `src/i18n/index.ts` | Dictionary registration, typed translator, current translator outside React |
| `src/i18n/LocaleProvider.tsx` | React context, preference updates, direction handling |
| `src/features/preferences/Preferences.tsx` | Persisted language selection and validation |
| `src/theme/tokens.ts` | Simple Mode text scale and Urdu line-height scale |
| `src/components/AppText.tsx` | Theme text and removal of Urdu letter spacing |
| `tests/i18n.test.ts` | Dictionary parity and behavior tests |

Inside React:

```tsx
const { t, tn, fmt, isRTL } = useI18n();
const label = t("common.today");
const countLabel = tn("home.doses", 3);
const dateLabel = fmt.dayFull(new Date());
```

Outside React, use `getI18n()`. Pure helpers can accept an explicit translator for testing. `t` checks message keys; `tn` checks plural base keys. Parameters fill named placeholders such as `{name}`. Runtime fallback is English, then the key itself.

## Text and date conventions

- English and Urdu messages use `_one` and `_other` plural entries; both entries must exist.
- Use `fmt` rather than scattered date-formatting calls. English date/time formatting uses the device locale, even when the chosen interface language is English.
- The in-app time picker uses a 12-hour clock. Ordinary English time labels may be 12 or 24 hour according to device formatting; Urdu uses the app's explicit wording and 12-hour formatting.
- Urdu month/day names are supplied by the app, with Western digits. This avoids dependence on platform Urdu locale data.
- Stored schedules remain `HH:MM`; date-only fields remain `YYYY-MM-DD`; event instants remain ISO timestamps.
- Database enum-like values remain stable codes. Translate their presentation, not the stored value. Known guardian relationship labels are translated; custom text is retained.
- Use `marginStart`/`marginEnd` and direction-aware arrows such as `Chevron`. Avoid added letter spacing for Urdu; `AppText` removes it and the theme increases line height.
- Newly planned notifications and action-category labels use the current locale. Replanning still depends on successful data access and native scheduling. Preserved snoozes can retain earlier wording.

## Adding or changing messages

1. Add the English key and matching Urdu translation, preserving placeholder names.
2. For counts, add both plural variants and use `tn` at the call site.
3. Use shared text/controls and verify RTL direction, wrapping, larger text, and Simple Mode.
4. Run `npm run typecheck` and `npm test`.
5. Have a fluent Urdu reviewer check clarity, especially medication and missed-dose wording; key-parity tests do not establish translation quality.

To add another language, update the `Locale` type, `LOCALES`, dictionaries, formatter, persisted-preference validator, and tests. Settings choices are derived from `LOCALES`, but preference validation currently explicitly accepts only `system`, `en`, and `ur`. Update plural logic if the new language needs categories beyond one/other.

## Verification scope

The current parity test compares English and Urdu key sets, nonempty translations, placeholder names, and plural pairs. It also exercises formatted dates, schedule/refill descriptions, summaries, and guardian messages. Adding another dictionary requires extending parity coverage; registration alone does not make the existing test cover it.

Visual RTL, font rendering, screen-reader behavior, and notification text on native devices remain manual acceptance checks. See [Reliability](RELIABILITY.md#device-validation).
