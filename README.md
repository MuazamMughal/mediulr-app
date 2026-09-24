# Mediulr

**Medicine + Scheduler.** A personal, patient-only mobile app that unifies medication schedules, doctor-visit reminders, and everyday calendar events in one place.

- No provider/clinic accounts, no booking marketplace, no data sharing with third parties — by design, to stay out of HIPAA's business-associate scope. See [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md).
- Monetized via a flat patient subscription (~$2–4/month) through App Store / Play Store in-app purchase.

## Documentation

| Doc | What it covers |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Step-by-step: get the app running locally |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | App structure, modules, folder layout |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Database schema and relationships |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Build phases and current status |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | The data-sharing boundary that keeps this app out of HIPAA scope — read before adding any feature that touches a provider |

The full feasibility study and product spec (personas, competitive landscape, monetization detail, risks) lives in the project's Mediulr doc, not in this repo.

## Tech stack

- **App**: React Native + Expo, TypeScript
- **Backend**: Supabase (Postgres, Auth, Storage)
- **Notifications**: Expo Notifications (local, on-device)
- **Subscriptions**: RevenueCat + Apple/Google in-app purchase
- **Analytics**: PostHog

## Quick start

```bash
npm install
npm run start
```

See [docs/SETUP.md](docs/SETUP.md) for full environment setup, including Supabase project configuration.
