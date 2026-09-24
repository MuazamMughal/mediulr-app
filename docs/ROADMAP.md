# Roadmap

Condensed from the product spec's §5. This is the file to update as work actually gets done — check items off as they land.

## MVP Build (Months 0–3)

- [x] Project scaffold (Expo Router + TypeScript + Supabase)
- [x] Supabase schema + RLS policies (`supabase/migrations/0001_init.sql`)
- [x] Auth: sign up / log in (`app/login.tsx`)
- [x] Calendar Engine: day view merging medications + appointments (`app/(tabs)/index.tsx`) — week/month views still to build
- [x] Medication Scheduler: add medication, recurrence rules, dose logging (taken/skip)
- [x] Doctor-Visit Reminders: manual add, pre/post-visit notes
- [x] Notifications Engine: local scheduled notifications on add (`src/features/notifications`)
- [ ] Refill reminders (quantity is tracked; the "notify below threshold" job isn't wired up yet)
- [ ] Missed-dose escalation (caregiver alert) — not yet implemented
- [ ] Subscription paywall: UI stub exists (`app/paywall.tsx`), RevenueCat purchase flow not wired up — see `docs/SETUP.md` §6
- [ ] Run against a real Supabase project and a device/simulator (only type-checked and bundle-exported so far, not run live)

## Beta & Launch (Months 3–5)

- [ ] Closed beta (50–200 users)
- [ ] Onboarding flow tuned for "first add in under a minute"
- [ ] Retention instrumentation (PostHog) — week-4 retention is the north-star metric
- [ ] Public launch on App Store / Play Store

## Growth (Months 5+)

- [ ] Family/Caregiver Mode (multi-profile)
- [ ] Health-record PDF export
- [ ] Calendar widget / lock-screen view
- [ ] One-way calendar export to Google/Apple Calendar (patient's own calendar only)
- [ ] Smarter reminder timing

## Explicitly not planned

No provider/clinic phase. See [`COMPLIANCE.md`](COMPLIANCE.md) for why, and treat that boundary as a standing constraint, not a backlog item to revisit casually.
