# Data model

Postgres (via Supabase). Every table has Row Level Security enabled and scoped to `auth.uid()` (directly, or via `profiles.owner_id` for dependent profiles) — see `supabase/migrations/0001_init.sql`.

## Tables

### `profiles`
One row per person tracked in the app — the account holder or a dependent they manage.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `owner_id` | uuid, FK → `auth.users.id` | The account that manages this profile |
| `is_self` | boolean | True for the account holder's own profile |
| `display_name` | text | |
| `date_of_birth` | date, nullable | |
| `created_at` | timestamptz | |

### `medications`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `profile_id` | uuid, FK → `profiles.id` | |
| `name` | text | |
| `dosage` | text | e.g. "200mg" |
| `instructions` | text, nullable | e.g. "with food" |
| `recurrence_rule` | jsonb | See "Recurrence rule shape" below |
| `quantity_on_hand` | integer, nullable | For refill reminders |
| `refill_threshold` | integer, nullable | Trigger a refill reminder below this count |
| `start_date` | date | |
| `end_date` | date, nullable | Null = ongoing |
| `archived_at` | timestamptz, nullable | |
| `created_at` | timestamptz | |

### `dose_logs`
One row per scheduled dose occurrence — the adherence record.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `medication_id` | uuid, FK → `medications.id` | |
| `scheduled_at` | timestamptz | |
| `status` | text | `pending` \| `taken` \| `skipped` \| `snoozed` |
| `logged_at` | timestamptz, nullable | When the patient actually responded |

### `appointments`
Doctor-visit reminders — **patient-entered only, never synced to a provider system.**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `profile_id` | uuid, FK → `profiles.id` | |
| `provider_name` | text | Free text, not a linked account |
| `specialty` | text, nullable | |
| `location` | text, nullable | |
| `scheduled_at` | timestamptz | |
| `pre_visit_notes` | text, nullable | Checklist / prep notes |
| `post_visit_notes` | text, nullable | Filled in after the visit |
| `created_at` | timestamptz | |

### `food_entries`

What a profile ate and when — a plain log (no calories, macros or health judgements). Added in `0003_nutrition_exercise.sql`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `profile_id` | uuid | → `profiles.id`, cascade delete. Same ownership model as medications/appointments |
| `name` | text | 1–120 chars |
| `meal_type` | text | `breakfast` · `lunch` · `dinner` · `snack` · `other` |
| `eaten_at` | timestamptz | One instant for date + time; the app queries by local-day range |
| `quantity` | text | Optional free text ("1 bowl", "2 eggs") |
| `notes` | text | Optional |
| `created_at`, `updated_at` | timestamptz | `updated_at` maintained by a trigger |

### `exercise_entries`

What activity a profile did, when, and for how long. Added in `0003_nutrition_exercise.sql`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `profile_id` | uuid | → `profiles.id`, cascade delete |
| `exercise_type` | text | `walking` · `running` · `cycling` · `gym` · `strength` · `yoga` · `stretching` · `swimming` · `sports` · `other` |
| `name` | text | Custom label; required when the type is `other` |
| `started_at` | timestamptz | |
| `duration_minutes` | integer | 1–1440 |
| `intensity` | text | Optional: `light` · `moderate` · `vigorous` |
| `notes` | text | Optional |
| `created_at`, `updated_at` | timestamptz | |

Both tables are RLS-scoped through `profiles.owner_id = auth.uid()`, so each family member's entries are separate and only their owner can read or change them. Deleting a profile or the account removes them (cascade), so `delete_my_account()` needed no change. Reminders for meals/exercise are deliberately not modeled yet — extend `reminders.source_type` and `notifications/plan.ts` when they're wanted.

### `reminders`
Generic reminder config, one per medication or appointment (1:many — a dose can have multiple reminder offsets).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `source_type` | text | `medication` \| `appointment` |
| `source_id` | uuid | Points at `medications.id` or `appointments.id` |
| `offset_minutes` | integer | e.g. -15, -60, -1440 |
| `escalation_enabled` | boolean | Notify a caregiver if missed |

### `subscriptions`
Mirrors RevenueCat entitlement state for quick local reads.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid, PK, FK → `auth.users.id` | |
| `status` | text | `trial` \| `active` \| `expired` \| `canceled` |
| `current_period_end` | timestamptz, nullable | |
| `updated_at` | timestamptz | |

## Recurrence rule shape (`medications.recurrence_rule`)

Stored as JSON, interpreted by `src/lib/recurrence.ts` (shared between medications and appointments if needed later):

```json
{
  "type": "interval_hours",
  "every": 8
}
```
```json
{
  "type": "times_per_day",
  "count": 3,
  "at": ["08:00", "14:00", "20:00"]
}
```
```json
{
  "type": "weekdays",
  "days": ["mon", "tue", "wed", "thu", "fri"],
  "at": ["09:00"]
}
```

Keeping this as one jsonb column (rather than a rigid set of columns) avoids a migration every time a new recurrence pattern is needed — the recurrence engine is the part of this app most likely to grow features (§8 of the product spec).

## What's intentionally not modeled

No `providers`, `clinics`, `bookings`, or `messages` tables. Adding any of these is a compliance decision, not just a schema change — see [`COMPLIANCE.md`](COMPLIANCE.md).
