# Compliance and data handling

Last reviewed: **2026-09-27**. This document records the product boundary and data flows visible in the repository. It is not a legal determination, security certification, published privacy policy, or verification of hosted infrastructure.

## Product boundary

Mediulr is a personal organizer used by an account holder to manage their own and dependent profiles. Doctor visits are manually entered reminders; a provider name is free text. The app has no provider accounts, clinic dashboard, appointment booking, or patient-provider messaging.

The standing product constraint is to keep provider integrations and organizational access outside this app's scope. A future request for live sharing with a clinic, provider access, or booking integration needs a deliberate product and privacy review before implementation.

Guardian contacts support patient-initiated communication: the app opens a prefilled SMS or share sheet, and the patient controls sending. Guardians do not gain access to app records. The reserved `linked_user_id` database field does not implement account linking. Automatic server-sent alerts or a guardian login would require separate consent, permissions, and data-sharing design.

Patient-controlled PDF/data export remains planned. No export feature should be described as available today.

## Actual data flows

| Destination | Current contents and behavior |
|---|---|
| Supabase Auth | Account credentials/session management |
| Supabase Postgres | Profiles, medications/dose answers, visit notes, meals, exercise, guardian contacts, custom reminders/completions |
| Device AsyncStorage | Auth session, fetched health-record snapshots and query cache, pending record edits and dose answers, preferences |
| Native notification system | Titles, dosage/reminder text, optional dependent names, and action payloads |
| SMS/share target chosen by the patient | Prefilled missed-dose message, with medication/dosage/time and a dependent name when applicable |

Supabase is an external service processing app data. Therefore, “no data sharing with third parties” is not an accurate description of the architecture. The intended boundary is no provider integration, no health-data advertising, and patient control over outgoing guardian messages.

No Supabase Storage file-upload flow, analytics SDK, RevenueCat integration, or remote push sender is currently implemented. Adding any of these changes the processing/disclosure inventory and requires corresponding documentation updates.

## Controls present in code

- Every public table enables RLS; policies scope health records to the owner through profiles. Subscriptions are read-only to the owning client.
- Client configuration uses a public Supabase key. Server/service-role secrets must not be bundled as `EXPO_PUBLIC_*` variables.
- Account deletion invokes the authenticated `delete_my_account()` function; owned records cascade when the auth user is deleted, with legacy reminder rows explicitly removed first.
- Sign-out initiates query-cache, record-snapshot, both outbox, and pending-notification cleanup. Preferences remain on the device.
- Persistent caching includes food, exercise, guardian, profile, medication, visit, calendar, and custom reminder queries. Offline edits add separately stored record snapshots and a pending edit journal.
- There is no analytics or advertising integration in the current dependency/application code.

These controls are implemented, but live database policies, deployed functions, and concurrent lifecycle behavior still need validation. The client uses AsyncStorage for auth and cached health data; it does not add application-level encryption or use the installed SecureStore module for those records. There is no biometric app lock. Do not claim encrypted local storage based on the presence of a dependency.

Notification text and SMS can disclose health information on lock screens or in another application. The current app has no dedicated redacted-notification setting. A patient choosing to send a message does not erase the need to explain what it contains.

## Regulatory scope

Personal use and the absence of provider integration describe the current business model, but do not establish a blanket HIPAA exemption. Applicability depends on the parties, contracts, and whether the developer handles protected health information on behalf of a covered entity or business associate. Use the [HHS mobile health app resources](https://www.hhs.gov/hipaa/for-professionals/special-topics/health-apps/index.html) and [business associate guidance](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/business-associates/index.html) when reviewing the actual deployment and relationships.

Being outside HIPAA does not mean health-data obligations disappear. The FTC identifies health apps among technologies potentially subject to its Health Breach Notification Rule. Assess applicability and incident duties for the product's actual data sources and processing. [FTC Health Breach Notification Rule: Basics for Business](https://www.ftc.gov/business-guidance/resources/health-breach-notification-rule-basics-business).

Other jurisdictional privacy requirements and app-store policies should be assessed for the intended launch markets and final features. The provider boundary above is a product rule; it is not a legal test that automatically approves or prohibits every sharing feature.

## Release work and verification

- [ ] Publish a privacy policy describing the actual Supabase/device/notification/SMS data flows, purposes, retention, and contact process.
- [ ] Verify deployed migrations, RLS isolation between accounts, account-deletion cascades, and client key privileges using separate test accounts.
- [ ] Review transport/storage protections, hosting region, access controls, backups, logs, and retention in the deployed service; repository settings alone cannot establish them.
- [ ] Review local session/health-data storage and lock-screen exposure against the intended threat model.
- [ ] Validate handling of unsynced edits and answers, logout, session expiry, device loss, deletion, and backup retention.
- [ ] Implement and validate user export/portability. Distinguish implemented account deletion from yet-to-be-built export.
- [ ] Document incident assessment and notification procedures appropriate to the actual deployment.
- [ ] Review dependent/guardian data collection, user consent wording, and the intended age/market scope.
- [ ] Complete relevant store privacy/health disclosures before submission.
- [ ] If adding billing or analytics, document the new processors and exclude health content from analytics events; keep health-data sale/ad targeting outside the product design.

Deleting a database account does not retract an SMS already sent, a recipient's copy, or establish when infrastructure backups expire. Describe those distinctions in user-facing retention/deletion information.

For schema details see [Data model](DATA_MODEL.md); for cache/queue and notification limits see [Reliability](RELIABILITY.md); for remaining implementation work see [Roadmap](ROADMAP.md).
