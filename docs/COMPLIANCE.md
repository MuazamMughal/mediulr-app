# Compliance boundary — read before touching provider-facing anything

Mediulr is deliberately scoped to stay outside HIPAA's business-associate rules. This document exists so that boundary doesn't get crossed by accident three months from now.

## Why we don't need HIPAA / BAAs / provider verification

HIPAA governs **covered entities** (doctors, clinics, insurers, clearinghouses) and their **business associates** — vendors who handle health data *on behalf of* a covered entity.

Mediulr never becomes a business associate because:

- Every piece of data (medications, doses, doctor-visit notes) is entered **by the patient, for the patient**.
- Nothing is transmitted to, synced with, or made visible to a doctor, clinic, or any other organization through the app.
- There are no provider accounts, no booking engine, no patient-provider messaging.

## The one hard rule

> **Never ship a feature that sends, syncs, or exposes a patient's data to a doctor, clinic, or any other organization through the app.**

This means, concretely:

- ❌ No "share my schedule with my doctor" live-sync feature
- ❌ No provider login/dashboard of any kind
- ❌ No booking or appointment-request flow to a real clinic system
- ❌ No messaging between a patient and a provider through the app
- ✅ Guardians: the patient types in a trusted person's number, and on a missed dose the app opens the *patient's own* messaging app with a short prefilled note. The patient presses Send; Mediulr never contacts the guardian, and the guardian has no access to any data. **Automatic alerts (push/SMS sent by a server on the patient's behalf) or a guardian login that can see the schedule would cross this line's spirit and need a consent + privacy review first.**
- ✅ A patient exporting their own PDF/summary and sending it themselves (email, AirDrop, printout) is fine — **the patient controls the transmission, the app never does**

If a future feature request sounds like any of the ❌ items above, it requires a deliberate compliance review before it's built — not a judgment call made mid-sprint. See `docs/ROADMAP.md` for what's intentionally out of scope.

## What we still have to do (this is not "zero compliance")

- [ ] Clear, specific privacy policy (not boilerplate) — required by both app stores regardless of HIPAA status
- [ ] Encryption at rest and in transit (Supabase gives us this by default; verify config)
- [ ] Minimal data collection — only fields the app actually uses
- [ ] User-initiated data export and full account/data deletion
- [ ] Never sell or use health data for ad-targeting
- [ ] Basic GDPR/CCPA-style rights (access, deletion, portability) if we have EU/UK/California users
- [ ] Review Apple's health-data guidelines and Google Play's Health Apps policy before store submission
