# Production readiness review

Reviewed **2026-09-28** against this repository. **Not ready for public release.** The code now has protected navigation, an email callback, password recovery, an Android reminder channel, and no exposed fake purchase action. These are implementation changes, not evidence that hosted auth, database policies, native notifications, or purchases work in production.

## Verified locally

- `npm run typecheck` passes.
- `npm test` passes all 113 logic tests, including callback-link parsing and offline edit ordering.
- Playwright passed 20 browser checks across phone and desktop layouts against intercepted Supabase responses. This covers rendered forms and offline persistence/replay, not deployed backend correctness; see [Functional and UI audit](FUNCTIONAL_UI_AUDIT.md).
- `npx expo export` bundles successfully for web, Android, and iOS. These are JavaScript exports, not signed native builds or device tests.
- `npx expo config --type public` resolves the `mediulr` URL scheme, native app IDs, and notification plugin.
- `npm audit --omit=dev` reports **14 moderate, 0 high, 0 critical** advisories. The paths include Expo tooling, `expo-router` → `query-string` → `decode-uri-component`, and build-time `xcode` → `uuid`. npm suggests incompatible major Expo downgrades for several paths; review compatible upstream releases and actual exploitability before changing the SDK or adding overrides.

## Release gates

| Gate | Required evidence |
|---|---|
| Hosted Supabase schema and RLS | Apply/reconcile migrations on a disposable project; test two accounts for cross-account reads and writes, dependent records, deletion cascades, and supply triggers. The repository cannot prove the deployed schema matches its SQL. |
| Auth email flow | Allowlist each exact callback URL, confirm email templates preserve `RedirectTo`, configure dependable SMTP, and test sign-up, confirmation, expired links, reset, and session expiry on standalone iOS/Android builds and the deployed web host. [Supabase redirect guidance](https://supabase.com/docs/guides/auth/redirect-urls). |
| Sensitive local data | Review AsyncStorage use for auth sessions, cached health records, guardians' phone numbers, and offline queues. No app-level encryption or device lock protects those records today. Choose and test a storage and sign-out policy appropriate to the threat model. |
| Native reminders | Build with the notification plugin and test permissions, Android channel, actions from locked/background/terminated states, reboot, timezones, and long app inactivity. The app has no headless refresh worker and plans only a limited horizon. |
| Billing | Connect store products, purchase/restore SDK, trusted entitlements, and webhook verification before presenting subscriptions. The Premium entry is hidden; legacy links show an unavailable screen. |
| Privacy and store release | Publish accurate privacy/support information, verify data export and deletion expectations, review app-store health disclosures, and complete native accessibility and localization QA. |
| Dependency review | Triage the moderate audit findings against Expo-compatible fixes; repeat audit and build verification before a release candidate. |

A GitHub Actions workflow runs install, typecheck, logic tests and Playwright browser tests on pushes and pull requests. It has not yet run on the hosted CI service. [Functional and UI audit](FUNCTIONAL_UI_AUDIT.md) describes the browser checks and fixes. Live database policy tests and native-device acceptance results remain absent. [Setup](SETUP.md), [Reliability](RELIABILITY.md), [Compliance](COMPLIANCE.md), and [Roadmap](ROADMAP.md) contain the supporting details.
