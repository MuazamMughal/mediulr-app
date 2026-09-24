# Architecture

## Folder layout

```
app/                    # Expo Router screens (file-based routing)
  index.tsx               # Auth gate — redirects to /login or /(tabs)
  login.tsx                # Sign in / sign up
  (tabs)/
    index.tsx               # Calendar Engine — unified daily timeline (the home tab)
    medications.tsx          # Medication Management list
    appointments.tsx          # Doctor-Visit Reminders list, grouped Upcoming/Past
    profile.tsx                # Health Profile + Family/Caregiver switcher
  medication/
    [id].tsx              # Medication detail
    new.tsx                # Add medication flow
  appointment/
    [id].tsx
    new.tsx
  onboarding/
    index.tsx              # First-run flow → first medication/appointment in <1 min
  paywall.tsx              # Subscription & Billing screen
  settings.tsx

src/
  theme/                  # Design system: colors, spacing/radius/typography tokens, ThemeProvider
  components/             # Shared UI primitives (AppText, AppButton, AppCard, AppInput, TimelineItem, …)
  features/
    calendar/              # Calendar Engine module
    medications/            # Medication Scheduler module (recurrence logic, adherence)
    appointments/            # Doctor-Visit Reminders module
    notifications/            # Notifications Engine (local push, snooze, escalation)
    profile/                   # Health Profile + Family/Caregiver Mode
    subscription/               # Subscription & Billing (RevenueCat) — not yet built, see paywall.tsx
  lib/
    supabase.ts              # Supabase client
    recurrence.ts             # Recurrence-rule engine (shared by medications + appointments)
    friendlyError.ts          # Turns raw Supabase/network errors into human-readable alert text
  types/
    database.ts               # Hand-written stand-in for generated Supabase types
    domain.ts                  # App-level domain types
  store/                     # State management (client state, cached queries) — not yet needed beyond React Query

supabase/
  migrations/                # SQL migrations (source of truth for schema)

docs/                       # This documentation
```

## Design system

`src/theme/` holds the visual foundation — one calm, warm-neutral palette with a mild terracotta-orange accent (see `colors.ts`), a six-size type scale and spacing/radius/shadow tokens (`tokens.ts`), all exposed through `useTheme()` (`ThemeProvider.tsx`, wrapping the whole app in `app/_layout.tsx`). Every screen reads from this instead of hardcoding colors or sizes, so the whole app changes consistently from one place — to retheme, edit `colors.ts` only. Dark-mode values already exist in `colors.ts` but aren't wired up or QA'd yet — `app.json`'s `userInterfaceStyle` is pinned to `"light"` until that happens (see `docs/ROADMAP.md`).

`src/components/` are the reusable building blocks screens are assembled from — `AppText`/`AppButton`/`AppCard`/`AppInput` for generic UI, `TimelineItem`/`DoseCheckButton`/`MedicationRow`/`VisitCard` for the health-specific pieces, plus `EmptyState`/`Skeleton` for loading/empty states. No screen should hand-roll a button or a card style — extend a shared component instead.

**App icon**: `assets/icon.png` and the Android adaptive-icon layers are generated, not hand-drawn — `scripts/generate-icons.mjs` draws the "M" mark as a plain SVG polyline (no font dependency) and rasterizes it with `@resvg/resvg-js`. Re-run `node scripts/generate-icons.mjs` after changing the accent color in `colors.ts` to keep the icon in sync, or edit the script directly for a different mark.

## Module → feature mapping

This mirrors §6 ("Functional Structure") of the product spec — every module below is patient-only, nothing here talks to a provider system.

| Module | Code location | Responsibility |
|---|---|---|
| Auth & Profile | `src/features/profile`, Supabase Auth | Sign-up/login, biometric lock, multi-profile (dependents) |
| Calendar Engine | `src/features/calendar` | Merges medication + appointment + custom events into one day/week/month view |
| Medication Scheduler | `src/features/medications`, `src/lib/recurrence.ts` | Dosage, recurrence rules, refill tracking, adherence logging |
| Doctor-Visit Reminders | `src/features/appointments` | Manual entry, pre-visit checklist, post-visit notes — **never synced to a real provider system** |
| Notifications Engine | `src/features/notifications`, `src/lib/notifications.ts` | Local push, snooze/reschedule, missed-dose escalation |
| Health Profile | `src/features/profile` | Medication list, allergies, conditions; patient-controlled PDF export |
| Family/Caregiver Mode | `src/features/profile` | Dependent profiles under one account |
| Subscription & Billing | `src/features/subscription` | RevenueCat + Apple/Google IAP |

## Cross-cutting layers

- **Data & Privacy**: Supabase Row Level Security (RLS) — every table scoped so a user can only ever read/write their own (and their dependents') rows. See `supabase/migrations/`.
- **Sync**: local-first cache (React Query + AsyncStorage) so today's reminders still render and fire offline; writes sync back to Supabase when connectivity returns.
- **Analytics**: PostHog, tracking retention/engagement events only — never medication content itself.

## Deliberately absent

No provider directory, no booking engine, no clinic dashboard, no patient-provider messaging. See [`COMPLIANCE.md`](COMPLIANCE.md) before adding anything that looks like these.
