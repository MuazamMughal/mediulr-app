# Mediulr

**Medicine + Scheduler.** A personal health organizer for medication doses, doctor visits, custom reminders, meals, and exercise. One account can manage its own profile and dependent family profiles.

This is an Expo / React Native app with a Supabase backend. Core features are implemented; billing and several launch tasks remain open. This documentation reflects the repository as reviewed on **2026-09-27**, not a certification of the deployed service or device behavior.

## Current features

- Daily timeline with a selectable month grid and collapsible week strip, activity markers, and dose progress.
- Medications with 1–4 editable daily dose times, ongoing or fixed treatment lengths, taken/skipped answers, stop/delete controls, and supply tracking.
- Manual doctor visits with date, location, preparation notes, post-visit notes, and advance reminders.
- Custom reminders: once, daily, selected weekdays, monthly, or every N days; mark individual occurrences done.
- Food and exercise logs, shown on the calendar and a separate Lifestyle tab.
- Family profile switching and up to three guardian contacts per profile. A missed-dose action opens a message for the patient to send.
- Local notification planning, action buttons, ten-minute snoozes, and optional dose follow-ups.
- Cached schedule data and an offline queue for taken/skipped dose answers. Other writes require connectivity.
- English and Urdu, RTL layout support, and Simple Mode with larger text and controls.
- Email/password authentication, sign-out cleanup, and account deletion through a database function.

There are no provider accounts, clinic integrations, booking services, or automatic guardian messages. Health records are stored in Supabase; see [data handling and product boundaries](docs/COMPLIANCE.md).

## Implementation status

| Area | Current state |
|---|---|
| App | Expo SDK 57, React Native 0.86, React 19, TypeScript |
| Navigation | Expo Router; five main tabs, detail screens, and forms |
| Server data | Supabase Auth/Postgres, React Query, SQL ownership policies |
| Device persistence | AsyncStorage for auth, selected query results, dose queue, and preferences |
| Notifications | On-device scheduling through Expo Notifications; no remote push backend |
| Subscription | Paywall mockup displays $2.99/month; purchase, restore, and entitlement logic are absent |
| Analytics | PostHog is planned, not installed or connected |

Supabase Storage is not used by the current app. RevenueCat, PDF export, biometric locking, and a clinical allergies/conditions profile are not implemented.

## Quick start

Use Node 24.3+ within the Node 24 release line and npm. From a fresh checkout:

```bash
npm ci
cp .env.example .env
```

Fill in the two Supabase public environment variables, apply migrations `0001` through `0006` in order, then run:

```bash
npm run start
```

See [Setup](docs/SETUP.md) for authentication configuration, web preview, Android APK builds, and troubleshooting. Preserve an existing `.env` instead of copying over it.

## Checks

```bash
npm run typecheck
npm test
```

The 2026-09-27 code review passed TypeScript checking and all 103 tests across six files. These are logic tests; they do not verify live RLS policies, migration deployment, rendered screens, purchases, or notification delivery on devices.

## Documentation

| Document | Purpose |
|---|---|
| [Setup](docs/SETUP.md) | Environment, migrations, running, builds, checks, troubleshooting |
| [Architecture](docs/ARCHITECTURE.md) | Routes, providers, modules, queries, and design system |
| [Data model](docs/DATA_MODEL.md) | Tables, relationships, recurrence, and database behavior |
| [Reliability](docs/RELIABILITY.md) | Notifications, offline scope, editing, and device validation |
| [Languages](docs/LANGUAGES.md) | English/Urdu behavior and translation development |
| [Roadmap](docs/ROADMAP.md) | Implemented features and remaining work |
| [Compliance and data handling](docs/COMPLIANCE.md) | Product boundaries, data flows, and launch review items |

The wider feasibility study and product specification are maintained outside this repository. Use the code and SQL migrations to establish what currently exists; use the roadmap for planned work.
