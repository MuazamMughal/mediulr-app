# Reliability

Last reviewed: **2026-09-28**. This describes implemented behavior and known limits. Local notifications, storage, and background execution are not guarantees that a dose reminder will always be delivered or answered.

## Notification plan

[plan.ts](../src/features/notifications/plan.ts) builds a time-sorted plan across all profiles owned by the account.

| Event | Planned behavior |
|---|---|
| Medication dose | At its scheduled time; respects creation, course end, and stop time |
| Unanswered dose follow-up | 15 and 30 minutes later, when follow-ups are enabled |
| Final follow-up with an eligible guardian | Offers a manual Tell guardian action |
| Doctor visit | 24 hours and 1 hour before the visit, if those instants remain in the future |
| Custom reminder | At each occurrence, excluding saved completed occurrences |

Medication/custom reminder planning looks seven days ahead. Follow-ups cover doses due within 24 hours and can include remaining nudges for a dose up to 30 minutes overdue. Appointment offsets are not restricted to the seven-day horizon. The combined plan is sorted and capped at 60 notifications; a busy family schedule can fill that cap well before seven days.

Follow-ups default to on in preferences and can be disabled in Settings. Persisted taken/skipped answers and queued offline answers are excluded from the dose plan. If fetching dose answers or required custom completions fails, sync leaves the existing native schedule unchanged.

## Scheduling lifecycle

`useReminderSync` mounts with the tabs and replans when its fetched source data, language, or follow-up preference changes, and when the app returns to the foreground. It does not periodically replenish the schedule while the app is closed. Returning to the foreground does not guarantee every cached source record has been refetched first.

`replaceAllReminders` serializes replacement operations, cancels scheduled non-snooze notifications, then schedules the new plan. It preserves snoozes because they are not part of that plan. Replacement is not atomic: an error after cancellation can leave a partial schedule. Permission denial causes a no-op, and scheduling errors are logged. Saving a record can therefore succeed without a notification being installed.

There is no push-token registration, remote notification sender, or background schedule-refresh service. The 60-item planning cap does not include preserved snoozes, so the total native pending count can exceed it. Long app inactivity, dense schedules, source edits, and deletion with pending snoozes need device validation.

## Notification actions

Action categories and payload parsing live in `notifications/actions.ts`; registration/scheduling in `scheduleNotifications.ts`; response handling in `useNotificationActions.ts`.

- **Taken / Skip:** enqueue the dose answer, attempt synchronization, and request cancellation of that occurrence's main notification, follow-ups, and snoozes.
- **Snooze:** schedule another notification ten minutes from the tap. It does not save a snoozed dose status or cancel other follow-ups.
- **Tell guardian:** fetch eligible contacts and open a prefilled SMS, falling back to sharing. The patient decides whether to send it.
- **Done** on a custom reminder: persist its completion in the edit queue, then cancel that occurrence's notifications. Replay to Supabase runs when connectivity returns.
- A plain notification tap opens the app; it does not navigate to a particular record.

The root listener handles responses while JavaScript is running and checks the last notification response at launch. Taken/Skip/Done/Snooze are configured not to foreground the app; Tell guardian does foreground it. No headless task is registered, so the current code must not be described as guaranteeing immediate action handling while terminated. Duplicate-response suppression is in memory for the current process.

Expo's Android Expo Go limitation since SDK 53 concerns remote push; its documentation says local notifications remain available. Standalone device builds are still the acceptance target for this app's notification behavior. [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/).

## Offline scope

| Data/action | Current behavior |
|---|---|
| Previously fetched records and calendar ranges | AsyncStorage snapshots and a three-day persisted query cache |
| Supported profile, medication, visit, food, exercise, guardian, reminder, and completion changes | Ordered persistent queue and immediate local projection |
| Taken/skipped dose answers | Separate retry queue with attempted device persistence and immediate timeline overlay |

The query cache uses `mediulr:query-cache`, a three-day maximum age, and a version buster. Fetched row snapshots use `mediulr:edit-snapshots:v1`; queued edits use `mediulr:edit-outbox:v1`. These contain fetched records and local changes, not every possible day. A previously unopened day may have no historical data while offline. Restoration depends on a usable auth session and device storage.

### Record edit queue

Create, update, delete, and custom completion changes are written to AsyncStorage before the form reports success. They overlay fetched snapshots immediately, including after restart. The queue replays in order at startup, on foreground, and every 20 seconds while the app runs. A child edit waits behind an unsynced parent, and dose answers for a newly created medication wait for that medication to sync. There is no OS background worker while the app is suspended.

Transient failures leave edits queued. A database rejection marks the first affected edit as failed and blocks later edits in the queue; the tab banner offers Retry or Discard. Discard removes the rejected edit but may leave dependent edits that then reject separately. Device-storage failure rejects the edit instead of claiming it was saved. Server writes use client-generated IDs and existence checks to avoid duplicate creates after a lost acknowledgement. A server-side deletion of a record before a queued update replays is reported as a failed edit.

The UI projects pending edits over the most recent fetched snapshot. It cannot show historical rows never fetched on that device. Snapshot storage is not a complete local replica, and edits from another device are reconciled when server reads resume. Sign-out warns about pending edits and clears them with the snapshots; account deletion still requires connectivity.

### Dose outbox

The queue in `features/offline` keeps one answer per `(medicationId, scheduledAt epoch)` and attempts to save it under `mediulr:dose-outbox`, including the original answer time. A later answer replaces the earlier one. UI overlays apply it immediately; confirmed answers patch loaded calendar arrays before the queue entry is removed. The save can fail silently, leaving the answer only in memory for the current app session.

Flushes run sequentially at tab startup, on foreground, and on a 20-second timer while entries are waiting and JavaScript is active. Transient failures retain entries; database errors in the configured permanent-error classes and entries older than seven days are dropped during flush. The mounted sync hook reports dropped entries. There is no OS background worker guaranteeing retries while suspended.

Storage errors are swallowed so the current session can continue in memory. Consequently, queue acceptance is not proof of durable storage if the device write failed. The queue is cleared on sign-out, so unsynced answers do not intentionally carry into another account.

### Cleanup

The `SIGNED_OUT` listener clears in-memory queries, requests persisted-cache removal, clears both edit and dose queues and record snapshots, and cancels pending native notifications. Account deletion calls `delete_my_account()` and then signs out locally. Device preferences remain. These asynchronous cleanup paths need testing alongside in-flight saves and notification replacements; there is no transactional cancellation of all ongoing work.

## Refill tracking

Migration `0005` adjusts `quantity_on_hand` when a dose is saved as taken or its status changes into/out of taken. An unchanged taken upsert does not decrement twice. Each taken occurrence consumes one unit, regardless of the free-text dosage; decrements clamp to zero.

The default low threshold is approximately three days of scheduled doses, with a minimum of one. UI warnings appear on Home and medication views. The UI suppresses a refill warning when the remaining course has enough supply. Notification bodies independently project a decreasing supply over upcoming unanswered doses; they do not use the same course-aware suppression. Neither estimate is a pharmacy inventory ledger or standalone refill job.

Counts refresh after server synchronization. A pending offline answer updates the dose row immediately, but not the server-backed supply count. At zero supply, changing taken back to skipped can add a unit even if the original decrement was clamped; this needs inventory-specific handling if exact stock accounting is required.

## Editing and history

- Medication name, dosage, notes, supply, and end date update in place. Earlier calendar rows can display edited labels, and changing the end date can change derived occurrences.
- Editing dose times queues creation of a new medication before archiving the old one. Replay is ordered, but these remain separate server requests, not a database transaction. A rejected archive can leave the new row saved and will appear in the failed-edit banner.
- Stop archives the medication and retains earlier occurrences/answers. Delete removes the medication and its dose logs through cascade.
- Custom reminder edits replace the rule in place; there is no schedule-version history or remapping of completion timestamps.
- Visit changes refresh visit/calendar queries; notification changes depend on the sync lifecycle above.
- Home custom-reminder toggles are optimistic while the persistent queue accepts them, and roll back if device persistence fails. Notification replanning subscribes to queued edits; test completion and undo on devices before relying on cancellation/restoration.

## Presentation limits

Simple Mode uses larger theme text/selected controls, collapses the calendar initially, and hides Lifestyle navigation and Home quick-add icons. Date/time fields use shared in-app panels. The picker uses a 12-hour clock; ordinary English time labels follow the device locale. Urdu behavior is documented in [Languages](LANGUAGES.md).

The Home now marker, overdue rows, and date-dependent summaries update on render/data changes; they do not have a dedicated minute or midnight clock refresh. Timezone travel and day rollover need acceptance testing.

## Device validation

Use test accounts and disposable records. Record build, OS, timezone, language, and results rather than assuming the logic tests cover delivery.

1. Add the first medication through onboarding, enter tabs, and verify its native pending reminder.
2. Test dose and custom reminder actions in foreground, background, locked, and terminated states; relaunch to inspect persisted answers.
3. Test permission denial/revocation, Android channels/build configuration, device reboot, and battery restrictions.
4. Take/skip offline, restart offline, reconnect, and verify one answer and one supply adjustment.
5. Complete/undo a custom reminder online/offline and inspect notification cancellation/restoration.
6. Change schedules, stop/delete records with pending snoozes, and verify no stale notifications remain.
7. Exercise many doses across family profiles, inspect the 60-item cap, and test schedule replenishment after inactivity.
8. Switch accounts or delete an account with queued writes and replacement operations in flight.
9. Check local midnight, daylight-saving changes, travel timezones, Urdu RTL, and large text.

The local 2026-09-28 review passed typechecking, 113 logic tests, and a web export. [Functional and UI audit](FUNCTIONAL_UI_AUDIT.md) covers browser workflows with intercepted backend responses, including offline reload and replay. PostgREST SDK retries are disabled so the app can reach snapshots promptly; queries and queues handle retries. This review did not execute the native-device checklist or validate deployed SQL policies/triggers.
