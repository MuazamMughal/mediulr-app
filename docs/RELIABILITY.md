# Reliability: notification buttons, follow-ups, refills, offline

How the "a dose must never be missed because of the phone" features work, and what each needs.

## Notification buttons (Taken / Snooze / Skip)
- Dose notifications carry action buttons (`notifications/actions.ts`, registered in `scheduleNotifications.ts`). **Taken** and **Skip** don't open the app; **Snooze** schedules another reminder in 10 minutes; **Tell guardian** (last follow-up only, and only for profiles that have a guardian) opens a prefilled message.
- Each notification carries the dose it is about in its `data` (`plan.ts`), so a tap knows which dose to answer. Taps are handled at the root (`useNotificationActions`), whichever screen is open, and a tap made while the app was closed is picked up on next launch.
- **Needs a real build**: local notifications with buttons don't work in Expo Go on Android (SDK 53+). The APK/dev build is required. Whether a button tap fully works with the app *killed* differs between iOS and Android and must be checked on real devices; if the answer can't be saved at that moment it is queued (below) and sent on next launch.

## Follow-ups and escalation
- If a dose is unanswered, it is nudged 15 and 30 minutes after its time (`FOLLOW_UP_MINUTES`). If the profile has a guardian, the 30-minute one offers "Tell guardian". Only doses in the next 24 hours get follow-ups so they never use up the 60-notification budget.
- Turn off in Settings → Follow-up reminders.
- Answered doses get **nothing**: not the reminder, not follow-ups, not snoozes. This includes doses taken early, and answers still waiting in the offline queue (the plan is built from saved answers plus the queue). If today's answers can't be fetched (no signal), the existing schedule is left untouched instead of rebuilt from incomplete data.

## Refill tracking
- `medications.quantity_on_hand` counts down by one when a dose becomes **taken** (database trigger, migration `0005`), so it is exact and can't double-count when an answer is synced twice. Skipping doesn't use a pill; changing taken → skipped gives it back; never below zero.
- The warning threshold is about three days of doses (`defaultRefillThreshold`). A course that will finish before the supply runs out never asks for a refill. Shown on the medication list, the medication screen, a banner on Home, and as a note on the dose reminders that run the supply low.

## Offline
- Answering a dose never waits for the network (`features/offline`). The answer goes into a durable queue on the phone and shows as answered at once; it is sent when a connection allows (on start, when the app returns to the foreground, and every 20 s while anything is waiting). The time you *answered* is what gets saved, not the time it synced.
- Refused answers (e.g. the medication was deleted) are dropped and reported; anything else is retried for up to 7 days.
- A copy of the schedule (profiles, medications, visits, calendar) is cached on the phone for 3 days so the app opens and shows what's due with no signal. **Not** cached: food, exercise, guardians' phone numbers. The cache and the queue are wiped on sign-out.
- Scope: answering doses is offline-safe. Adding or editing medications, visits, food etc. still needs a connection and says so if it fails.

## Editing
- Name, dosage, notes, supply and end date are edited in place. Changing the **times** would rewrite every past day (doses are derived from the schedule), so it stops the old medication and starts a new one from now — history is preserved (`replaceMedicationSchedule`).
- Deleting a medication removes its dose history too; Stop keeps it. Deleting a visit cancels its reminders.

## Simple mode
- Settings → Simple mode: text ×1.25 everywhere the design system is used, bigger buttons and dose check, larger tab bar, week strip instead of the month grid, and no Lifestyle tab / quick-add icons.

## Time and date pickers
- One in-app picker is used everywhere a time or date is chosen (medication dose times, food, exercise, doctor visits, the day navigator): `TimePanel` (hour grid, minute grid, AM/PM, ±1 minute) and `DatePanel` (month grid), opened inline under the field with a Done button.
- It replaced the system date/time dialogs (`@react-native-community/datetimepicker`, now removed). On Android those dialogs are driven imperatively and could reopen on a later re-render — e.g. when tapping Save. A plain in-page panel has no such state, looks identical on every phone, and has large touch targets.
- Times display in 12-hour form regardless of device locale; storage is unchanged (`"HH:MM"` for schedules, ISO instants elsewhere).
