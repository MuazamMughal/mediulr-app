# Functional and UI audit

Reviewed **2026-09-28**. This audit exercises the exported web app in installed Google Chrome, using isolated, intercepted Supabase responses and disposable records. It does not access or modify a live account.

The full run passed **20 browser checks**, followed by **four passing checks** after the final Urdu switch adjustment. TypeScript validation, exports for **web, Android and iOS**, and **113 logic tests** also passed. Native exports validate bundling; they are not device test results.

## Coverage

The Playwright suite runs ten scenarios at both 375 × 812 and 1280 × 900. The appearance scenario also checks a 320-pixel viewport. Each scenario checks for uncaught browser errors.

| Area | Browser checks |
|---|---|
| Authentication | Private route protection, disabled empty login, wrong-credential feedback, password-reset email validation and confirmation |
| Medications | Required fields, create, list, edit, delete; authenticated edit/detail deep links |
| Dose answers | Immediate offline Taken state, reload persistence, reconnect replay, reload after sync |
| Meals | Offline create, reload, edit, reconnect replay, delete |
| Visits and exercise | Create, edit and delete; required visit fields |
| Guardians | Invalid phone blocks saving; valid contact saves |
| Custom reminders | Offline create, reload, reconnect replay, Done and undo |
| Family and sign-out | Family creation through the visible Save action; private cache removal; private route protection after sign-out |
| Recovery from read errors | Refused profile query displays a retry action; retry restores Home |
| Presentation | Sign-in, calendar, medication/exercise/reminder forms, Simple Mode, Urdu settings, dark appearance, narrow layouts, horizontal overflow, primary-button text contrast |

Screenshots are inspection artifacts, not pixel-baseline regression assertions. Horizontal document overflow and primary-button contrast are automated checks; this is not a complete accessibility certification.

## Changes prompted by the audit

- Disabled additional PostgREST SDK retries so failed requests can reach the app's offline snapshots promptly. React Query and the persistent queues still own retries.
- Wait for the saved session before evaluating route guards, preserving authenticated private links during startup.
- Give forms opened through direct links a Home fallback when there is no screen to dismiss to.
- Show a retryable Home error when required reads fail instead of leaving skeletons or implying an empty calendar.
- Skip native notification APIs on web. Reminder saves no longer depend on browser permission; permission errors are handled without preventing record saves.
- Add accessible names and roles to shared inputs/buttons and profile/settings actions.
- Add a visible Save button for family-member creation.
- Constrain sign-in and recovery forms on wide displays; enlarge sheet close targets and allow titles to wrap.
- Keep web switch thumbs within their tracks on Urdu screens using a local direction boundary; native switches retain their platform behavior.
- Darken light-theme action and tertiary text colors and improve dark-theme tertiary text. The active primary-button combinations meet the tested 4.5:1 text contrast threshold.

## Reproducing the checks

```bash
npm ci
npx playwright install chromium
npm run test:ui
```

On this Mac, the Playwright Chromium download does not support macOS 13. Installed Google Chrome was used instead:

```bash
PLAYWRIGHT_BROWSER_CHANNEL=chrome npm run test:ui
```

The command exports the app into `.ui-dist`, then starts an isolated static server on `127.0.0.1:8091`. Expo still requires the public Supabase configuration during export. Browser requests to Supabase are intercepted by `tests/ui/mockSupabase.ts`. CI uses dummy public configuration and Chromium. Artifacts are in `test-results/`; failure traces can be opened with `npx playwright show-trace PATH_TO_TRACE`.

## Remaining acceptance work

- Run the real hosted database with two accounts to verify RLS, triggers, cascade deletion, conflicts, schema migrations, and rejected writes. The mock cannot establish server correctness.
- Test signup, confirmation and recovery email links end to end, token expiry, account deletion and network failures against a disposable hosted project.
- Verify native builds, keyboards, safe areas, large device font sizes, VoiceOver/TalkBack, Urdu direction after restart, SMS/share handlers, notification delivery and actions across lifecycle states.
- Offline browser tests interrupt backend requests while leaving the app bundle reachable. They verify persistent data under a backend outage; they do not prove a web page can launch without internet. No service-worker app-shell cache is implemented.
- Review the existing production gates for local health-data storage, billing, dependencies and store/privacy requirements in [Production readiness](PRODUCTION_READINESS.md).

Passing browser and logic checks does not establish readiness for public release.
