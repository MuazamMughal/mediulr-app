# Architecture

## Folder layout

```
app/                    # Expo Router screens (file-based routing)
  (tabs)/
    calendar.tsx         # Calendar Engine — day/week/month unified view
    medications.tsx       # Medication Management list
    appointments.tsx      # Doctor-Visit Reminders list
    profile.tsx            # Health Profile + Family/Caregiver switcher
  medication/
    [id].tsx              # Medication detail/edit
    new.tsx                # Add medication flow
  appointment/
    [id].tsx
    new.tsx
  onboarding/
    index.tsx              # First-run flow → first medication/appointment in <1 min
  paywall.tsx              # Subscription & Billing screen
  settings.tsx

src/
  components/             # Shared UI components
  features/
    calendar/              # Calendar Engine module
    medications/            # Medication Scheduler module (recurrence logic, adherence)
    appointments/            # Doctor-Visit Reminders module
    notifications/            # Notifications Engine (local push, snooze, escalation)
    profile/                   # Health Profile + Family/Caregiver Mode
    subscription/               # Subscription & Billing (RevenueCat)
  lib/
    supabase.ts              # Supabase client
    notifications.ts          # expo-notifications wrapper
    recurrence.ts             # Recurrence-rule engine (shared by medications + appointments)
  types/
    database.ts               # Generated Supabase types
    domain.ts                  # App-level domain types
  store/                     # State management (client state, cached queries)

supabase/
  migrations/                # SQL migrations (source of truth for schema)

docs/                       # This documentation
```

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
