# Roadmap

Condensed from the product spec's §5. This is the file to update as work actually gets done — check items off as they land.

## MVP Build (Months 0–3)

- [x] Project scaffold (Expo Router + TypeScript + Supabase)
- [x] Supabase schema + RLS policies (`supabase/migrations/0001_init.sql`)
- [x] Auth: sign up / log in (`app/login.tsx`)
- [x] Calendar Engine: day view merging medications + appointments (`app/(tabs)/index.tsx`) — week/month views still to build
- [x] Medication Scheduler: add medication, recurrence rules, dose logging (taken/skip)
- [x] Customizable dose reminder times: each dose slot's clock time is editable, not locked to the frequency default (`src/components/TimeSlotEditor.tsx`)
- [x] Doctor-Visit Reminders: manual add, pre/post-visit notes
- [x] Notifications Engine: local scheduled notifications on add (`src/features/notifications`)
- [x] Family/Caregiver Mode: add dependent profiles (`app/(tabs)/profile.tsx`)
- [x] Design system: theme tokens, reusable components, full visual redesign across every screen (`src/theme/`, `src/components/`)
- [x] Motion & delight pass: haptics on primary actions and Mark Taken, spring/fade transitions on the timeline and empty states, a live "now" marker on today's calendar, custom bottom-sheet headers for the add flows
- [x] Native platform pass (via Expo's official design-system/native-ui skills): real `formSheet` presentation with an OS grab handle for Add Medication/Add Doctor Visit/Paywall (replacing a drawn handle bar), `borderCurve: "continuous"` squircle corners on cards/buttons/inputs, `boxShadow` instead of legacy shadow props, accessibility roles/labels on icon-only controls (Mark Taken, day navigation, sheet close)
- [x] Treatment length: choose Ongoing / 3–30 days / custom when adding a medication; after the last day the medication clears from the calendar, reminders stop, and it moves to "Completed" (history stays)
- [x] Audit pass: fixed taken/skipped not persisting (timestamp format mismatch), UTC date-parsing bugs, stale calendar after adding, lost history on stop, family profile switching, rolling 7-day reminder sync capped for iOS's 64 limit, cache/reminder wipe on sign-out — covered by `npm test` (`tests/logic.test.ts`)
- [x] Run against a real Supabase project and a device (tested live via Expo Go)
- [ ] Refill reminders (quantity is tracked; the "notify below threshold" job isn't wired up yet)
- [ ] Missed-dose escalation (caregiver alert) — the Calendar visually flags a missed dose, but no notification/alert is sent to a caregiver yet
- [ ] Subscription paywall: UI is fully designed (`app/paywall.tsx`), RevenueCat purchase flow not wired up — see `docs/SETUP.md` §7
- [x] Account deletion: Settings calls `delete_my_account()` — **run `supabase/migrations/0002_delete_account.sql` in the Supabase SQL editor first**, or the app will say deletion isn't set up
- [ ] Week/month calendar views (only the single-day view exists)
- [ ] Dark mode: palette exists in `src/theme/colors.ts` but isn't wired up or visually QA'd (`app.json` pins light mode for now)
- [ ] Local notifications on Android specifically require a development build — Expo Go dropped support in SDK 53 (works fine on iOS/dev builds)

## Beta & Launch (Months 3–5)

- [ ] Closed beta (50–200 users)
- [ ] Onboarding flow tuned for "first add in under a minute"
- [ ] Retention instrumentation (PostHog) — week-4 retention is the north-star metric
- [ ] Public launch on App Store / Play Store

## Growth (Months 5+)

- [ ] Health-record PDF export
- [ ] Calendar widget / lock-screen view
- [ ] One-way calendar export to Google/Apple Calendar (patient's own calendar only)
- [ ] Smarter reminder timing

## Explicitly not planned

No provider/clinic phase. See [`COMPLIANCE.md`](COMPLIANCE.md) for why, and treat that boundary as a standing constraint, not a backlog item to revisit casually.
