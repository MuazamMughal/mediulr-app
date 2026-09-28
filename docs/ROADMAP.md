# Roadmap

Status reviewed against the repository on **2026-09-28**. Checked items mean implemented in code, not verified in production. This replaces the earlier month-based estimates; no release dates are committed here.

## Implemented

- [x] Expo Router / React Native / TypeScript app with Supabase Auth and Postgres access.
- [x] Six SQL migrations covering ownership policies, profile creation, account deletion, lifestyle logs, guardians, supply adjustment, and custom reminders.
- [x] Email/password sign-in/sign-up, protected routes, email-link callbacks, password recovery UI, and basic onboarding.
- [x] Unified daily timeline for doses, visits, meals, exercise, and custom reminders.
- [x] Selectable month grid and collapsible week strip with per-day markers.
- [x] Medication creation with 1–4 daily dose times, duplicate-time validation, ongoing courses, preset durations, and custom courses up to 365 days.
- [x] Medication editing, schedule replacement, stopping, deletion, and completed/stopped lists.
- [x] Taken/skipped dose answers, immediate UI updates, persistent retry queue, and cached schedule queries.
- [x] Persistent offline queue and local display for supported profile, medication, visit, food, exercise, guardian, and custom reminder/completion changes.
- [x] Supply countdown through a database trigger, low-supply UI, and projected refill notes in dose notifications.
- [x] Manual visit creation/editing/deletion and pre/post-visit notes.
- [x] Food and exercise creation/editing/deletion, daily summaries, and calendar markers.
- [x] Custom reminders: once, daily, selected weekdays, monthly, every N days, and per-occurrence completion.
- [x] Dependent profile creation and switching.
- [x] Guardian contacts and patient-initiated missed-dose messages, with SMS/share fallback.
- [x] Local notification planning across family profiles, action categories, ten-minute snoozes, and 15/30-minute follow-ups.
- [x] English/Urdu dictionaries, localized notification text, RTL handling, and Simple Mode.
- [x] Shared themed components, form sheets, haptics, in-app date/time pickers, and browser Alert adapter.
- [x] Account deletion UI/RPC and sign-out cache/queue/notification cleanup paths.
- [x] EAS preview APK and production build profile configuration.
- [x] Typechecking and 113 logic tests in the local review.
- [x] GitHub Actions workflow for dependency install, typechecking, and logic tests.

## Reliability and release validation

- [ ] Verify migration deployment, account isolation, deletion cascades, and supply triggers against a real test database.
- [ ] Validate native notification permissions/configuration, action buttons, cold launch, background/killed states, device reboot, and account changes.
- [ ] Address schedule renewal when the app stays closed beyond the planned horizon or the 60-item cap shortens coverage.
- [ ] Validate notification replacement races, preserved snoozes after edits/deletion, and custom-reminder completion/undo behavior.
- [ ] Verify first-medication onboarding and direct-route behavior: reminder/dose sync hooks currently mount only in the tab layout.
- [ ] Validate offline restoration, storage-write failures, rejected edits, prolonged disconnection, and cleanup with in-flight requests on devices.
- [ ] Improve consistent loading/error/retry behavior on core calendar, medication, and profile screens.
- [ ] Add integration/device coverage for the above; current tests exercise pure logic, not delivery or database enforcement.

See [Reliability](RELIABILITY.md) for the implemented guarantees and limits. Automatic guardian messaging is not an unfinished part of the current manual contact feature.

## Before public launch

- [ ] Validate confirmation and recovery email links, redirect allowlists, SMTP delivery, and session expiry on web and standalone builds.
- [ ] Connect RevenueCat/store purchases, restoration, entitlements, and trusted server updates. Paywall UI currently has no purchase behavior.
- [ ] Review deployed security settings, local storage choices, privacy disclosures, retention, and incident handling; see [Compliance](COMPLIANCE.md).
- [ ] Implement user data export/portability. Account deletion is implemented but needs deployment verification.
- [ ] Complete native device QA for English/Urdu, RTL, large text, Simple Mode, and accessibility.
- [ ] Finish dark-mode configuration and visual QA. Both palettes exist and the provider reads the color scheme, but native configuration is pinned to light.
- [ ] Instrument retention/engagement if proceeding with PostHog; decide and review the exact non-health-content events before adding it.
- [ ] Measure and refine onboarding, including the intended quick first-add experience.
- [ ] Run the planned closed beta, prepare store listings/disclosures, and submit release builds.

## Later product work

- [ ] Health-record PDF export.
- [ ] Calendar widget / lock-screen view.
- [ ] One-way export to the patient's own Google/Apple calendar.
- [ ] Smarter reminder timing and longer-term scheduling reliability.

Biometric lock and allergies/conditions were mentioned in older architecture prose, but have no implementation here; they need explicit product scope before being treated as committed features. The current calendar is a day timeline with week/month date navigation, not a multi-day agenda.

## Product boundary

Provider directories, clinic dashboards, appointment booking, and patient-provider messaging remain outside the product scope. Guardian logins/shared access and server-sent alerts would require a separate product, consent, and privacy design. See [Compliance and data handling](COMPLIANCE.md).
