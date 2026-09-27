# Setup

Last reviewed: **2026-09-27**. These steps describe the checked-in configuration; they do not confirm which migrations or settings are deployed to the connected project.

## Requirements

- Node 24.3+ within the Node 24 release line; the last checks used Node 24.15.0.
- npm and access to a Supabase project.
- A browser for UI development, or an SDK-compatible Expo Go/native build for mobile testing.
- For native builds: the relevant Expo/EAS account and platform build credentials.

The app declares Expo SDK 57, React Native 0.86.3, and React 19.2.3. Use `package-lock.json` for reproducible installs. The repository's `.npmrc` enables `legacy-peer-deps`; do not silently discard that configuration when reproducing an install.

## 1. Install and configure

```bash
npm ci
```

For a fresh checkout without `.env`:

```bash
cp .env.example .env
```

Populate:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_CLIENT_KEY
```

Use the target project's public client key, never a service-role key. These values are bundled into the client. Access control depends on authentication and database policies, not on hiding this key. `.env` is ignored by Git. Keep existing local values when updating the repository, and restart Metro after changing them.

`src/lib/supabase.ts` throws at startup if either variable is absent. It persists the auth session using AsyncStorage.

## 2. Apply all six migrations

On a new Supabase database, run these files in order using its SQL editor:

| File in `supabase/migrations/` | Adds |
|---|---|
| `0001_init.sql` | Profiles, medications, dose logs, visits, legacy reminders, subscription placeholder, RLS policies, sign-up profile trigger |
| `0002_delete_account.sql` | Authenticated `delete_my_account()` function |
| `0003_nutrition_exercise.sql` | Food/exercise tables, indexes, timestamp triggers, policies |
| `0004_guardians.sql` | Guardian contacts, insert limit, policies |
| `0005_refill_countdown.sql` | Dose-status trigger that adjusts medication supply |
| `0006_custom_reminders.sql` | Custom reminders, completions, indexes, policies |

These files contain ordinary `CREATE TABLE` and `CREATE TRIGGER` statements; they are not safe to rerun indiscriminately. On an existing project, establish which migrations have already run and apply only the missing ones. Use a disposable project first when validating deployment procedures.

The repository does not include `supabase/config.toml` or a ready-to-run local Supabase stack. If adopting the Supabase CLI, configure the project and reconcile migration history before using `db push`; SQL-editor changes are not automatically evidence of CLI migration history.

Missing later migrations affect their features: deletion reports a setup error, food/exercise or custom reminders fail to load, guardians are unavailable, and supply does not count down without `0005`. See [Data model](DATA_MODEL.md).

## 3. Configure test authentication

Login uses Supabase email/password authentication. Sign-up creates a self profile through the database trigger.

For isolated development, either use confirmed test accounts or disable email confirmation in the test project's auth settings. When confirmation is enabled and sign-up returns no session, the app tells the user to check email and stays at login.

The app has the `mediulr` URL scheme, but no complete auth callback or password-reset flow. `detectSessionInUrl` is disabled in the client. Production confirmation/recovery needs implementation and testing; adding an allowed redirect URL alone does not complete it.

## 4. Run locally

| Command | Purpose |
|---|---|
| `npm run start` | Start Expo/Metro |
| `npm run android` | Start Expo targeting Android |
| `npm run ios` | Start Expo targeting iOS |
| `npx expo start --web` | Browser preview |
| `npm run typecheck` | TypeScript validation |
| `npm test` | All six logic test files |

The Android/iOS npm scripts start the development server; they do not build a standalone app. Native folders are generated and ignored by Git.

Web preview supports the routes, forms, calendar, and browser-backed persistence. `src/lib/webAlert.ts` adapts confirmation alerts. Native notifications and haptics are not a web test target; SMS links/share behavior depends on the browser and installed handlers.

## 5. Native notification testing

Mediulr schedules **local** notifications. It does not obtain push tokens or send through a remote push service. Expo distinguishes the Android Expo Go restriction on remote push from local notifications, which remain available. Use a standalone build for acceptance testing of Mediulr's action buttons and lifecycle behavior. [Expo Notifications documentation](https://docs.expo.dev/versions/latest/sdk/notifications/).

Some source comments still attribute all notification limitations to Expo Go; the actual wrapper attempts lazy loading and catches module errors. Permission denial or scheduling failure can leave records saved without notifications. Check permissions and device logs, then follow the [device checklist](RELIABILITY.md#device-validation).

`app.json` currently has no explicit `expo-notifications` plugin entry, and scheduling code does not configure an Android notification channel. Review the native setup against the target build and Expo's documentation before relying on delivery. Background action processing is not fully implemented or verified.

## 6. EAS build profiles

`eas.json` defines:

- `preview`: internal distribution; Android output is an APK.
- `production`: automatic version increment and remote version source.

Both profiles contain public Supabase values for the existing project. They must point at the intended backend; changing only local `.env` does not update these profile values. `app.json` also contains the existing EAS project ID, `com.mediulr.app` identifiers, and `mediulr` scheme. A separate deployment needs its own project/credentials configuration.

With EAS CLI configured for the intended project, the existing profiles can be invoked with:

```bash
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

There is no `development` profile or `expo-dev-client` dependency today. Configure those explicitly if adopting a development-client workflow. Building does not submit an app to either store; store submission and purchases remain separate work.

## 7. Maintenance and checks

```bash
npm run typecheck
npm test
```

The 2026-09-27 review passed both checks: 103 tests across `logic`, `health`, `guardians`, `reliability`, `i18n`, and `reminders`. No lint script, UI test runner, CI workflow, or database integration test suite is checked in.

Database types in `src/types/database.ts` are hand-maintained. After verifying the live schema, generate candidate types to a temporary file for review rather than overwriting the source blindly:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > /tmp/mediulr-database.types.ts
```

Reconcile generated types with application use, then typecheck. To regenerate image assets after intentionally changing the icon script:

```bash
node scripts/generate-icons.mjs
```

The script owns its color constants independently of the theme and rewrites the PNG assets.

## Troubleshooting

| Symptom | Check |
|---|---|
| Missing Supabase config at startup | Both public variables are populated; restart Metro |
| New account cannot sign in | Email confirmation state and the configured target project |
| No self profile / persistent loading | Initial migration, sign-up trigger, authenticated session, and query errors |
| Meals, exercise, guardians, or reminders unavailable | Corresponding migration and RLS policies |
| Supply never decreases | Migration `0005`; the dose must be saved as taken |
| Notification does not fire | Permission, native module/build configuration, scheduling logs, notification cap, foreground refresh |
| Offline day has no data | That day may not have been fetched before; persistence is a query cache |
| Urdu text changes but layout does not | Close and reopen the native app to apply direction |
| Tests fail with an IPC socket permission error | `tsx` needs permission to create its local IPC socket in restricted execution environments |

## Billing remains unconfigured

The paywall's subscribe action dismisses the screen and Restore has no handler. There is no RevenueCat SDK, entitlement gate, webhook, or purchase backend. The `subscriptions` table is reserved for a future integration. Implement and test store products, purchases/restoration, trusted entitlement updates, and access rules before treating the displayed price as an available subscription.
