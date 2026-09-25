import test from "node:test";
import assert from "node:assert/strict";
import { defaultRefillThreshold, dosesPerDay, refillHeadline, refillStatus } from "../src/features/medications/refill";
import { OUTBOX_MAX_AGE_MS, createDoseOutbox, doseKey, isPermanentError, type KeyValueStorage, type PendingDose } from "../src/features/offline/outbox";
import { applyPendingDoses, patchSavedDose, pendingDoseKeys } from "../src/features/offline/overlay";
import { FOLLOW_UP_MINUTES, MAX_SCHEDULED_REMINDERS, planReminders } from "../src/features/notifications/plan";
import { ACTION, doseActionFrom, isDoseNotificationId, isSnoozeId, parseDoseData } from "../src/features/notifications/actions";
import { SIMPLE_MODE_TEXT_SCALE, scaleTypography, typography } from "../src/theme/tokens";
import type { CalendarEvent, Medication, Profile } from "../src/types/domain";

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);

function med(overrides: Partial<Medication> = {}): Medication {
  return {
    id: "m1", profileId: "p1", name: "Amoxicillin", dosage: "500mg", instructions: null,
    recurrenceRule: { type: "times_per_day", count: 3, at: ["08:00", "14:00", "20:00"] },
    quantityOnHand: null, refillThreshold: null,
    startDate: "2026-09-01", endDate: null, archivedAt: null, createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}
const me: Profile = { id: "p1", ownerId: "u1", isSelf: true, displayName: "Me", dateOfBirth: null };

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  async getItem(k: string) { return this.data.get(k) ?? null; }
  async setItem(k: string, v: string) { this.data.set(k, v); }
}
const networkError = new Error("Network request failed");
const dbError = (code: string) => Object.assign(new Error("rejected"), { code });

// --- refill -------------------------------------------------------------------------------------
test("doses per day and the default 3-day threshold", () => {
  assert.equal(dosesPerDay({ type: "times_per_day", count: 3, at: ["08:00", "14:00", "20:00"] }), 3);
  assert.equal(dosesPerDay({ type: "interval_hours", every: 8 }), 3);
  assert.equal(dosesPerDay({ type: "weekdays", days: ["mon", "thu"], at: ["09:00"] }), 2 / 7);
  assert.equal(defaultRefillThreshold({ type: "times_per_day", count: 3, at: ["08:00", "14:00", "20:00"] }), 9);
  assert.equal(defaultRefillThreshold({ type: "weekdays", days: ["mon"], at: ["09:00"] }), 1);
});

test("refill status: plenty, low, out, and no tracking", () => {
  const now = local(2026, 9, 25, 10);
  assert.equal(refillStatus(med(), now), null, "no quantity → not tracked");
  const plenty = refillStatus(med({ quantityOnHand: 60 }), now)!;
  assert.deepEqual([plenty.low, plenty.empty, plenty.daysLeft], [false, false, 20]);
  const low = refillStatus(med({ quantityOnHand: 8 }), now)!;
  assert.deepEqual([low.low, low.empty, low.daysLeft], [true, false, 2]);
  assert.equal(refillHeadline(low), "About 2 days left");
  const out = refillStatus(med({ quantityOnHand: 0 }), now)!;
  assert.ok(out.low && out.empty);
  assert.equal(refillHeadline(out), "Out — refill needed");
  assert.equal(refillHeadline(refillStatus(med({ quantityOnHand: 2 }), now)!), "Less than a day left");
});

test("refill: a custom threshold wins, and a stopped medication is never 'low'", () => {
  const now = local(2026, 9, 25, 10);
  assert.equal(refillStatus(med({ quantityOnHand: 12, refillThreshold: 15 }), now)!.low, true);
  assert.equal(refillStatus(med({ quantityOnHand: 12, refillThreshold: 5 }), now)!.low, false);
  assert.equal(refillStatus(med({ quantityOnHand: 1, archivedAt: "2026-09-20T00:00:00.000Z" }), now), null);
});

test("refill: a course that ends before the supply runs out never asks for a refill", () => {
  const now = local(2026, 9, 25, 10); // today: 14:00 and 20:00 left, then 25-26... course ends 27th
  const enough = refillStatus(med({ quantityOnHand: 8, endDate: "2026-09-27" }), now)!;
  assert.equal(enough.low, false, "8 pills cover the 8 doses left in the course");
  const short = refillStatus(med({ quantityOnHand: 5, endDate: "2026-09-27" }), now)!;
  assert.equal(short.low, true);
});

// --- outbox -------------------------------------------------------------------------------------
const dose = (over: Partial<PendingDose> = {}): Omit<PendingDose, "queuedAt"> => ({
  medicationId: "m1", scheduledAt: "2026-09-25T08:00:00.000Z", status: "taken", ...over,
});

test("outbox: queued answers are visible immediately, sent in order, and cleared on success", async () => {
  const box = createDoseOutbox(new MemoryStorage(), { now: () => 1000 });
  const seen: number[] = [];
  box.subscribe(() => seen.push(box.list().length));
  await box.enqueue(dose());
  assert.equal(box.list().length, 1);
  const sent: string[] = [];
  const res = await box.flush(async (i) => { sent.push(i.status); });
  assert.deepEqual([res.sent, res.blocked, res.dropped.length], [1, false, 0]);
  assert.equal(box.list().length, 0);
  assert.deepEqual(sent, ["taken"]);
});

test("outbox: offline keeps everything; reconnecting sends it; nothing is sent twice", async () => {
  const box = createDoseOutbox(new MemoryStorage());
  await box.enqueue(dose({ scheduledAt: "2026-09-25T08:00:00.000Z" }));
  await box.enqueue(dose({ scheduledAt: "2026-09-25T14:00:00.000Z", status: "skipped" }));
  let calls = 0;
  const offline = await box.flush(async () => { calls += 1; throw networkError; });
  assert.deepEqual([offline.sent, offline.blocked, box.list().length, calls], [0, true, 2, 1], "stops at the first failure");
  const sent: string[] = [];
  const online = await box.flush(async (i) => { sent.push(i.scheduledAt); });
  assert.equal(online.sent, 2);
  assert.equal(sent.length, 2);
  assert.equal((await box.flush(async () => { throw new Error("must not be called"); })).sent, 0);
});

test("outbox: the queue survives an app restart", async () => {
  const storage = new MemoryStorage();
  const first = createDoseOutbox(storage);
  await first.enqueue(dose());
  const afterRestart = createDoseOutbox(storage);
  await afterRestart.load();
  assert.equal(afterRestart.list().length, 1);
  assert.equal(afterRestart.list()[0].medicationId, "m1");
});

test("outbox: answering the same dose again replaces the earlier answer", async () => {
  const box = createDoseOutbox(new MemoryStorage());
  await box.enqueue(dose({ status: "skipped" }));
  await box.enqueue(dose({ status: "taken" }));
  assert.equal(box.list().length, 1);
  assert.equal(box.list()[0].status, "taken");
});

test("outbox: a changed answer during a flush is not thrown away", async () => {
  const box = createDoseOutbox(new MemoryStorage(), { now: (() => { let t = 0; return () => ++t; })() });
  await box.enqueue(dose({ status: "skipped" }));
  await box.flush(async () => { await box.enqueue(dose({ status: "taken" })); }); // person changes their mind mid-send
  assert.equal(box.list().length, 1, "the newer answer is still waiting");
  assert.equal(box.list()[0].status, "taken");
});

test("outbox: permanent database refusals are dropped, transient failures kept", async () => {
  assert.ok(isPermanentError(dbError("23503")), "medication deleted (foreign key)");
  assert.ok(isPermanentError(dbError("42501")), "permission denied");
  assert.ok(!isPermanentError(dbError("PGRST301")), "expired token is retried");
  assert.ok(!isPermanentError(networkError));
  assert.ok(!isPermanentError(null));
  const box = createDoseOutbox(new MemoryStorage());
  await box.enqueue(dose());
  const res = await box.flush(async () => { throw dbError("23503"); });
  assert.deepEqual([res.dropped.length, res.blocked, box.list().length], [1, false, 0]);
});

test("outbox: answers older than a week are dropped rather than sent forever", async () => {
  let now = 0;
  const box = createDoseOutbox(new MemoryStorage(), { now: () => now });
  await box.enqueue(dose());
  now = OUTBOX_MAX_AGE_MS + 1;
  let called = false;
  const res = await box.flush(async () => { called = true; });
  assert.deepEqual([called, res.dropped.length, box.list().length], [false, 1, 0]);
});

test("outbox: corrupt saved data starts clean instead of crashing", async () => {
  const storage = new MemoryStorage();
  storage.data.set("mediulr:dose-outbox", "{not json");
  const box = createDoseOutbox(storage);
  await box.load();
  assert.equal(box.list().length, 0);
  await box.enqueue(dose());
  assert.equal(box.list().length, 1);
});

// --- overlay ------------------------------------------------------------------------------------
test("overlay: queued answers show on the timeline; other doses and non-medication events are untouched", () => {
  const m = med();
  const pendingDose = (at: string) => ({ id: "x", medicationId: "m1", scheduledAt: at, status: "pending" as const, loggedAt: null });
  const events: CalendarEvent[] = [
    { kind: "medication", at: "2026-09-25T08:00:00.000Z", medication: m, dose: pendingDose("2026-09-25T08:00:00.000Z") },
    { kind: "medication", at: "2026-09-25T14:00:00.000Z", medication: m, dose: pendingDose("2026-09-25T14:00:00.000Z") },
    { kind: "custom", at: "2026-09-25T09:00:00.000Z", title: "x", notes: null },
  ];
  const pending: PendingDose[] = [{ medicationId: "m1", scheduledAt: "2026-09-25T08:00:00+00:00", status: "taken", queuedAt: 5 }];
  const out = applyPendingDoses(events, pending);
  assert.equal((out[0] as Extract<CalendarEvent, { kind: "medication" }>).dose.status, "taken", "'+00:00' and 'Z' are the same instant");
  assert.equal((out[1] as Extract<CalendarEvent, { kind: "medication" }>).dose.status, "pending");
  assert.equal(out[2], events[2]);
  assert.equal(applyPendingDoses(events, []), events, "nothing pending → same array");
  assert.ok(pendingDoseKeys(pending).has(doseKey("m1", "2026-09-25T08:00:00.000Z")));
});

// --- reminder plan: follow-ups, escalation, handled doses, refill notes -------------------------
const NOW = local(2026, 9, 25, 9, 0);
const plan = (extra: Partial<Parameters<typeof planReminders>[0]> = {}, meds = [med()]) =>
  planReminders({ medications: meds, appointments: [], profiles: [me], now: NOW, ...extra });

test("plan: without follow-ups, behaviour is unchanged (one reminder per dose)", () => {
  const ids = plan().map((r) => r.id);
  assert.ok(ids.every((id) => id.startsWith("dose:")));
  assert.equal(new Set(ids).size, ids.length);
});

test("plan: follow-ups add a nudge and a final overdue notice after each dose in the next 24h", () => {
  const p = plan({ followUps: true });
  const eight = local(2026, 9, 26, 8, 0).getTime();
  const ids = p.map((r) => r.id);
  assert.ok(ids.includes(`dose:m1:${eight}`));
  assert.ok(ids.includes(`nag:m1:${eight}:1`));
  assert.ok(ids.includes(`nag:m1:${eight}:2`));
  const nag1 = p.find((r) => r.id === `nag:m1:${eight}:1`)!;
  assert.equal(nag1.fireAt.getTime(), eight + FOLLOW_UP_MINUTES[0] * 60_000);
  const farOut = local(2026, 9, 29, 8, 0).getTime();
  assert.ok(ids.includes(`dose:m1:${farOut}`), "main reminders still cover the week");
  assert.ok(!ids.includes(`nag:m1:${farOut}:1`), "…but follow-ups stop after 24h");
});

test("plan: a dose that just passed still gets its remaining follow-up", () => {
  const now = local(2026, 9, 25, 8, 20); // 8:00 dose is 20 min old: nag 1 (8:15) is past, nag 2 (8:30) is due
  const p = planReminders({ medications: [med()], appointments: [], profiles: [me], now, followUps: true });
  const eight = local(2026, 9, 25, 8, 0).getTime();
  const ids = p.map((r) => r.id);
  assert.ok(!ids.includes(`dose:m1:${eight}`));
  assert.ok(!ids.includes(`nag:m1:${eight}:1`));
  assert.ok(ids.includes(`nag:m1:${eight}:2`));
});

test("plan: answered doses get no reminder and no follow-up — even ones taken early", () => {
  const two = local(2026, 9, 25, 14, 0).getTime();
  const p = plan({ followUps: true, handledDoses: new Set([`m1:${two}`]) });
  assert.ok(p.every((r) => !r.id.includes(`:${two}`)));
  assert.ok(p.some((r) => r.id.includes(`:${local(2026, 9, 25, 20, 0).getTime()}`)), "other doses unaffected");
});

test("plan: the last follow-up offers 'Tell guardian' only when the profile has one", () => {
  const eight = local(2026, 9, 26, 8, 0).getTime();
  const without = plan({ followUps: true }).find((r) => r.id === `nag:m1:${eight}:2`)!;
  assert.equal(without.category, "dose");
  const withG = plan({ followUps: true, guardianProfileIds: new Set(["p1"]) });
  assert.equal(withG.find((r) => r.id === `nag:m1:${eight}:2`)!.category, "dose_escalate");
  assert.equal(withG.find((r) => r.id === `nag:m1:${eight}:1`)!.category, "dose", "only the last one escalates");
  assert.equal(withG.find((r) => r.id === `dose:m1:${eight}`)!.category, "dose");
  const other = plan({ followUps: true, guardianProfileIds: new Set(["someone-else"]) });
  assert.equal(other.find((r) => r.id === `nag:m1:${eight}:2`)!.category, "dose");
});

test("plan: notifications carry what the action buttons need, including the family member's name", () => {
  const dad: Profile = { id: "p2", ownerId: "u1", isSelf: false, displayName: "Dad", dateOfBirth: null };
  const r = planReminders({ medications: [med({ profileId: "p2" })], appointments: [], profiles: [me, dad], now: NOW, followUps: true })[0];
  assert.deepEqual(
    { kind: r.data?.kind, med: r.data?.medicationId, name: r.data?.medicationName, patient: r.data?.patientName, profile: r.data?.profileId },
    { kind: "dose", med: "m1", name: "Amoxicillin", patient: "Dad", profile: "p2" }
  );
  assert.equal(new Date(r.data!.scheduledAt as string).getTime(), r.fireAt.getTime());
  assert.equal(plan()[0].data?.patientName, null, "yourself → null");
});

test("plan: reminders mention a low supply on the doses that will run it down", () => {
  // 12 pills, 3 a day, threshold 9: 14:00 → 11 left, 20:00 → 10 left, tomorrow 8:00 → 9 left (at the threshold).
  const bodies = plan({}, [med({ quantityOnHand: 12 })]).map((r) => r.body);
  assert.ok(!bodies[0].includes("refill") && !bodies[1].includes("refill"));
  assert.ok(bodies[2].includes("9 left, time to refill"), bodies[2]);
  // 2 pills: 14:00 → 1 left, 20:00 → the last one.
  const tight = plan({}, [med({ quantityOnHand: 2 })]).map((r) => r.body);
  assert.ok(tight[0].includes("1 left, time to refill"), tight[0]);
  assert.ok(tight[1].includes("last one — time to refill"), tight[1]);
  assert.ok(!plan({}, [med()])[0].body.includes("refill"), "no tracking → no note");
});

test("plan: still respects the notification budget with follow-ups on", () => {
  const many = Array.from({ length: 12 }, (_, i) => med({ id: `m${i}`, name: `Med ${i}` }));
  const p = plan({ followUps: true }, many);
  assert.ok(p.length <= MAX_SCHEDULED_REMINDERS);
  const times = p.map((r) => r.fireAt.getTime());
  assert.deepEqual(times, [...times].sort((a, b) => a - b), "soonest first");
});

// --- outbox clear (sign-out) ---------------------------------------------------------------------
test("outbox: clearing on sign-out empties memory and storage, so the next account never sends it", async () => {
  const storage = new MemoryStorage();
  const box = createDoseOutbox(storage);
  await box.enqueue(dose());
  await box.clear();
  assert.equal(box.list().length, 0);
  const next = createDoseOutbox(storage);
  await next.load();
  assert.equal(next.list().length, 0);
});

// --- notification data ----------------------------------------------------------------------------
test("notification data: a plan reminder round-trips through parseDoseData", () => {
  const r = plan({ followUps: true })[0];
  const parsed = parseDoseData(r.data)!;
  assert.deepEqual([parsed.medicationId, parsed.medicationName, parsed.dosage, parsed.patientName], ["m1", "Amoxicillin", "500mg", null]);
  assert.equal(new Date(parsed.scheduledAt).getTime(), r.fireAt.getTime() - (r.id.startsWith("nag") ? (r.id.endsWith(":1") ? 15 : 30) * 60_000 : 0));
});

test("notification data: anything malformed is 'not a dose' rather than a crash", () => {
  for (const bad of [undefined, null, "x", 5, {}, { kind: "visit" }, { kind: "dose" }, { kind: "dose", medicationId: "m", scheduledAt: "not a date", profileId: "p", medicationName: "n" }, { kind: "dose", medicationId: "", scheduledAt: "2026-09-25T08:00:00Z", profileId: "p", medicationName: "n" }]) {
    assert.equal(parseDoseData(bad), null, JSON.stringify(bad));
  }
  const minimal = parseDoseData({ kind: "dose", medicationId: "m", scheduledAt: "2026-09-25T08:00:00Z", profileId: "p", medicationName: "n" })!;
  assert.deepEqual([minimal.dosage, minimal.patientName], ["", null]);
});

test("notification buttons: known actions map, a plain tap and unknown ids do not", () => {
  for (const a of Object.values(ACTION)) assert.equal(doseActionFrom(a), a);
  assert.equal(doseActionFrom("expo.modules.notifications.actions.DEFAULT"), null);
  assert.equal(doseActionFrom("something-else"), null);
});

test("answering a dose clears its reminder, follow-ups and snoozes — and only that dose's", () => {
  const ms = 1_700_000_000_000;
  for (const id of [`dose:m1:${ms}`, `nag:m1:${ms}:1`, `nag:m1:${ms}:2`, `snooze:m1:${ms}:99`]) assert.ok(isDoseNotificationId(id, "m1", ms), id);
  for (const id of [`dose:m1:${ms + 1}`, `dose:m2:${ms}`, `nag:m1:${ms + 60000}:1`, `visit:m1:day`, `dose:m1:${ms}0`]) assert.ok(!isDoseNotificationId(id, "m1", ms), id);
  assert.ok(isSnoozeId(`snooze:m1:${ms}:99`) && !isSnoozeId(`nag:m1:${ms}:1`));
});

// --- simple mode ----------------------------------------------------------------------------------
test("simple mode scales every text style up, keeping line heights in proportion; normal mode is untouched", () => {
  assert.equal(scaleTypography(1), typography);
  const big = scaleTypography(SIMPLE_MODE_TEXT_SCALE);
  for (const name of Object.keys(typography) as (keyof typeof typography)[]) {
    assert.ok(big[name].fontSize > typography[name].fontSize, name);
    assert.ok(big[name].lineHeight >= big[name].fontSize, `${name}: line height still fits the text`);
    assert.equal(big[name].fontWeight, typography[name].fontWeight);
  }
  assert.equal(big.body.fontSize, 20);
});

test("a saved answer is written into loaded days so the row never flickers back to unanswered", () => {
  const m = med();
  const at = "2026-09-25T08:00:00.000Z";
  const pending = { id: `${m.id}:${at}`, medicationId: "m1", scheduledAt: at, status: "pending" as const, loggedAt: null };
  const events: CalendarEvent[] = [
    { kind: "medication", at, medication: m, dose: pending },
    { kind: "custom", at, title: "x", notes: null },
  ];
  const saved = { id: "real-id", medicationId: "m1", scheduledAt: "2026-09-25T08:00:00+00:00", status: "taken" as const, loggedAt: "2026-09-25T08:01:00.000Z" };
  const out = patchSavedDose(events, saved);
  assert.equal((out[0] as Extract<CalendarEvent, { kind: "medication" }>).dose.id, "real-id");
  assert.equal(out[1], events[1]);
  assert.equal(patchSavedDose(events, { ...saved, medicationId: "other" }), events, "another medication's answer changes nothing");
});
