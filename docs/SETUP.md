# Setup

## Prerequisites

- Node.js 20+ (developed against Node 24)
- Expo Go app on your phone (easiest way to run the app during development), or an iOS/Android simulator
- A free [Supabase](https://supabase.com) account

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once created, open **Project Settings → API** and copy the **Project URL** and **anon public key**.
3. Copy `.env.example` to `.env` and fill in those two values:

```bash
cp .env.example .env
```

## 3. Apply the database schema

The schema lives in `supabase/migrations/0001_init.sql` (tables, Row Level Security policies, and the trigger that auto-creates a "self" profile on signup — see [`DATA_MODEL.md`](DATA_MODEL.md)).

Easiest path (no CLI install required): open the Supabase dashboard → **SQL Editor** → paste the contents of `supabase/migrations/0001_init.sql` → Run.

Alternative, using the Supabase CLI, once you have a project linked:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### Second migration (account deletion)

Also run `supabase/migrations/0002_delete_account.sql` the same way. It adds the `delete_my_account()` function that the Settings screen's "Delete account & data" uses. Until it's applied, that button reports that deletion isn't set up.

## 4. Turn off email confirmation (for local testing)

By default Supabase requires clicking an email confirmation link before sign-in works. During local development there's nowhere for that link to redirect to, so sign-in fails with "email not confirmed."

**Authentication → Providers → Email** → toggle off **"Confirm email"** → Save.

If you already have a stuck unconfirmed test account: **Authentication → Users** → find it → confirm manually (or run `update auth.users set email_confirmed_at = now() where email = '...';` in the SQL Editor).

Before real launch this needs a proper fix — a deep-link redirect (`mediulr://`, already set as the app's `scheme` in `app.json`) so the confirmation email opens back into the app instead of a dead link. Turning confirmation back on then is a config toggle, not a code change.

## 5. Run the app

```bash
npm run start
```

This opens the Expo dev server — scan the QR code with Expo Go (iOS/Android) or press `i` / `a` for a simulator.

## 6. (Later) Regenerate types from the live schema

Once the schema in Supabase is the source of truth (rather than the hand-written stand-in), regenerate `src/types/database.ts`:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

## 7. (Before launch) Subscriptions

`app/paywall.tsx` is currently a UI stub with no real purchase flow. To wire up billing:

1. Create subscription products in App Store Connect and Google Play Console (~$2–4/month, per [the product spec](../README.md)).
2. Create a [RevenueCat](https://www.revenuecat.com) project, connect both stores.
3. `npx expo install react-native-purchases` and follow RevenueCat's Expo guide.
4. Point the `subscriptions` table's writes at a RevenueCat webhook → Supabase Edge Function (service-role key, never exposed client-side).

Not needed for local development — only before submitting to the stores.
