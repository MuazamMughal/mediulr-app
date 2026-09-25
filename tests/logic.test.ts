import test from "node:test";
import assert from "node:assert/strict";
import { addDays, courseEndDate, daysLeft, instantKey, parseLocalDate, toLocalDateString } from "../src/lib/dates";
import { occurrencesInRange } from "../src/lib/recurrence";
import { dosesInRange, isActiveMedication, medicationWindow } from "../src/features/medications/schedule";
import { describeCourse } from "../src/features/medications/describeCourse";
import { MAX_SCHEDULED_REMINDERS, planReminders } from "../src/features/notifications/plan";
import { buildMonthOverview } from "../src/features/calendar/overview";
import type { Appointment, DoseLog, Medication, Profile } from "../src/types/domain";

// --- helpers ------------------------------------------------------------------------------------
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);

function med(overrides: Partial<Medication> = {}): Medication {
  return {
    id: "m1",
    profileId: "p1",
    name: "Amoxicillin",
    dosage: "500mg",
    instructions: null,
    recurrenceRule: { type: "times_per_day", count: 3, at: ["08:00", "14:00", "20:00"] },
    quantityOnHand: null,
    refillThreshold: null,
    startDate: "2026-09-25",
    endDate: null,
    archivedAt: null,
    createdAt: local(2026, 9, 25, 0, 1).toISOString(), // created just after midnight, so nothing is clipped by default
    ...overrides,
  };
}
const day = (y: number, m: number, d: number) => ({ start: local(y, m, d, 0, 0), end: local(y, m, d, 23, 59) });

// --- dates --------------------------------------------------------------------------------------
test("toLocalDateString / parseLocalDate round-trip in local time", () => {
  assert.equal(toLocalDateString(local(2026, 9, 25, 0, 30)), "2026-09-25"); // 00:30 local must stay the 25th (UTC could say the 24th)
  assert.equal(toLocalDateString(local(2026, 9, 25, 23, 59)), "2026-09-25");
  const parsed = parseLocalDate("2026-09-25");
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 8);
  assert.equal(parsed.getDate(), 25);
  assert.equal(parsed.getHours(), 0); // local midnight, not UTC midnight
});

test("courseEndDate is inclusive: a 7-day course starting the 25th ends the 1st", () => {
  assert.equal(courseEndDate(local(2026, 9, 25, 15), 7), "2026-10-01");
  assert.equal(courseEndDate(local(2026, 9, 25, 15), 1), "2026-09-25");
});

test("addDays survives daylight-saving boundaries", () => {
  assert.equal(toLocalDateString(addDays(local(2026, 3, 7, 12), 1)), "2026-03-08");
  assert.equal(toLocalDateString(addDays(local(2026, 3, 8, 12), 1)), "2026-03-09");
  assert.equal(toLocalDateString(addDays(local(2026, 11, 1, 12), -1)), "2026-10-31");
});

test("daysLeft counts today and never goes negative", () => {
  const now = local(2026, 9, 25, 10);
  assert.equal(daysLeft(null, now), null);
  assert.equal(daysLeft("2026-09-25", now), 1); // last day
  assert.equal(daysLeft("2026-10-01", now), 7);
  assert.equal(daysLeft("2026-09-20", now), 0);
});

test("instantKey treats Postgres '+00:00' and JS 'Z' timestamps as the same instant", () => {
  assert.equal(instantKey("2026-09-25T03:00:00.000Z"), instantKey("2026-09-25T03:00:00+00:00"));
});

// --- recurrence ---------------------------------------------------------------------------------
test("times_per_day yields one dose per configured time, in order", () => {
  const { start, end } = day(2026, 9, 25);
  const doses = occurrencesInRange({ type: "times_per_day", count: 3, at: ["08:00", "14:00", "20:00"] }, start, end);
  assert.deepEqual(doses.map((d) => d.getHours()), [8, 14, 20]);
});

// --- the bug: taken/skipped never stuck ----------------------------------------------------------
test("BUG FIX: a saved dose log matches its dose even when Postgres formats the timestamp differently", () => {
  const { start, end } = day(2026, 9, 25);
  const m = med();
  const eight = local(2026, 9, 25, 8);
  const log: DoseLog = {
    id: "l1",
    medicationId: "m1",
    scheduledAt: eight.toISOString().replace("Z", "+00:00"), // exactly what PostgREST returns
    status: "taken",
    loggedAt: null,
  };
  const doses = dosesInRange(m, start, end, [log]);
  assert.equal(doses.length, 3);
  assert.equal(doses[0].dose.status, "taken");
  assert.equal(doses[1].dose.status, "pending");
});

test("a log for another medication never marks this one's dose", () => {
  const { start, end } = day(2026, 9, 25);
  const log: DoseLog = { id: "l", medicationId: "OTHER", scheduledAt: local(2026, 9, 25, 8).toISOString(), status: "taken", loggedAt: null };
  assert.equal(dosesInRange(med(), start, end, [log])[0].dose.status, "pending");
});

// --- the bug: dates parsed as UTC ---------------------------------------------------------------
test("BUG FIX: on day one, early-morning doses are kept (start date is local midnight, not UTC midnight)", () => {
  const { start, end } = day(2026, 9, 25);
  const doses = dosesInRange(med({ recurrenceRule: { type: "times_per_day", count: 2, at: ["01:00", "09:00"] } }), start, end, []);
  assert.deepEqual(doses.map((d) => new Date(d.at).getHours()), [1, 9]);
});

test("BUG FIX: the course's last day is fully included", () => {
  const m = med({ endDate: "2026-09-27" }); // 3-day course: 25th, 26th, 27th
  const last = day(2026, 9, 27);
  assert.equal(dosesInRange(m, last.start, last.end, []).length, 3);
});

// --- the new feature: treatment length ----------------------------------------------------------
test("a 3-day course produces exactly 9 doses across 3 days, then the calendar is clear", () => {
  const m = med({ endDate: courseEndDate(local(2026, 9, 25, 9), 3) });
  assert.equal(m.endDate, "2026-09-27");
  const counts = [25, 26, 27, 28, 29, 30].map((d) => {
    const { start, end } = day(2026, 9, d);
    return dosesInRange(m, start, end, []).length;
  });
  assert.deepEqual(counts, [3, 3, 3, 0, 0, 0]);
});

test("an ongoing medication keeps producing doses far in the future", () => {
  const { start, end } = day(2027, 3, 1);
  assert.equal(dosesInRange(med(), start, end, []).length, 3);
});

test("no doses before the start date", () => {
  const { start, end } = day(2026, 9, 24);
  assert.equal(dosesInRange(med(), start, end, []).length, 0);
});

test("isActiveMedication: ongoing, mid-course, finished, stopped", () => {
  const now = local(2026, 9, 27, 12);
  assert.equal(isActiveMedication(med(), now), true);
  assert.equal(isActiveMedication(med({ endDate: "2026-09-27" }), now), true); // last day still active at noon
  assert.equal(isActiveMedication(med({ endDate: "2026-09-26" }), now), false);
  assert.equal(isActiveMedication(med({ archivedAt: now.toISOString() }), now), false);
});

test("describeCourse labels: ongoing, N days left, last day, finished, stopped", () => {
  const now = local(2026, 9, 25, 9);
  assert.equal(describeCourse(med(), now).status, "Ongoing");
  assert.equal(describeCourse(med({ endDate: "2026-09-29" }), now).status, "5 days left");
  assert.equal(describeCourse(med({ endDate: "2026-09-25" }), now).status, "Last day");
  assert.equal(describeCourse(med({ endDate: "2026-09-24" }), now).status, "Finished");
  assert.equal(describeCourse(med({ archivedAt: now.toISOString() }), now).status, "Stopped");
});

// --- the bug: added-today doses shown as "missed"; stopped meds erased history -------------------
test("BUG FIX: adding a medication at 3pm creates no retroactive 8am/2pm doses", () => {
  const m = med({ createdAt: local(2026, 9, 25, 15, 0).toISOString() });
  const { start, end } = day(2026, 9, 25);
  assert.deepEqual(dosesInRange(m, start, end, []).map((d) => new Date(d.at).getHours()), [20]);
});

test("BUG FIX: stopping a medication keeps earlier doses on the calendar and drops later ones", () => {
  const m = med({ archivedAt: local(2026, 9, 25, 15, 0).toISOString() });
  const { start, end } = day(2026, 9, 25);
  assert.deepEqual(dosesInRange(m, start, end, []).map((d) => new Date(d.at).getHours()), [8, 14]); // history kept, 8pm gone
  const next = day(2026, 9, 26);
  assert.equal(dosesInRange(m, next.start, next.end, []).length, 0);
});

test("medicationWindow ends at the earlier of course end and stop time", () => {
  const stopped = local(2026, 9, 26, 10);
  const w = medicationWindow(med({ endDate: "2026-09-30", archivedAt: stopped.toISOString() }));
  assert.equal(w.endDate?.getTime(), stopped.getTime());
});

// --- reminders ----------------------------------------------------------------------------------
const profiles: Profile[] = [
  { id: "p1", ownerId: "u", isSelf: true, displayName: "Me", dateOfBirth: null },
  { id: "p2", ownerId: "u", isSelf: false, displayName: "Maria", dateOfBirth: null },
];

test("planReminders: only active medications, only future, only the next 7 days, soonest first", () => {
  const now = local(2026, 9, 25, 9, 0);
  const plan = planReminders({
    medications: [
      med({ id: "active" }),
      med({ id: "finished", endDate: "2026-09-20" }),
      med({ id: "stopped", archivedAt: local(2026, 9, 24).toISOString() }),
    ],
    appointments: [],
    profiles,
    now,
  });
  assert.ok(plan.length > 0);
  assert.ok(plan.every((r) => r.id.includes("active")));
  assert.ok(plan.every((r) => r.fireAt.getTime() > now.getTime()));
  assert.ok(plan.every((r) => r.fireAt.getTime() <= now.getTime() + 7 * 24 * 3600_000));
  assert.deepEqual([...plan].sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()), plan);
});

test("planReminders: a 3-day course stops scheduling after its last day", () => {
  const now = local(2026, 9, 25, 9, 0);
  const plan = planReminders({ medications: [med({ endDate: "2026-09-27" })], appointments: [], profiles, now });
  const lastFire = plan[plan.length - 1].fireAt;
  assert.equal(toLocalDateString(lastFire), "2026-09-27");
});

test("planReminders never exceeds the iOS pending-notification limit", () => {
  const now = local(2026, 9, 25, 0, 0);
  const many = Array.from({ length: 12 }, (_, i) =>
    med({ id: `m${i}`, recurrenceRule: { type: "times_per_day", count: 4, at: ["08:00", "12:00", "16:00", "20:00"] } })
  );
  const plan = planReminders({ medications: many, appointments: [], profiles, now });
  assert.equal(plan.length, MAX_SCHEDULED_REMINDERS);
  assert.ok(MAX_SCHEDULED_REMINDERS < 64);
});

test("planReminders: visits get day-before and hour-before reminders; past ones are skipped", () => {
  const now = local(2026, 9, 25, 9, 0);
  const visit = (id: string, at: Date): Appointment => ({
    id, profileId: "p1", providerName: "Dr. Patel", specialty: "Cardiology", location: null,
    scheduledAt: at.toISOString(), preVisitNotes: null, postVisitNotes: null,
  });
  const plan = planReminders({
    medications: [],
    appointments: [visit("soon", local(2026, 9, 25, 10, 30)), visit("later", local(2026, 9, 28, 10, 0)), visit("past", local(2026, 9, 20, 10, 0))],
    profiles,
    now,
  });
  const ids = plan.map((r) => r.id);
  assert.deepEqual(ids.filter((i) => i.startsWith("visit:soon")), ["visit:soon:hour"]); // day-before is already past
  assert.ok(ids.includes("visit:later:day") && ids.includes("visit:later:hour"));
  assert.ok(!ids.some((i) => i.startsWith("visit:past")));
});

test("planReminders names the family member for dependents, not for yourself", () => {
  const now = local(2026, 9, 25, 9, 0);
  const plan = planReminders({ medications: [med({ id: "mine" }), med({ id: "hers", profileId: "p2" })], appointments: [], profiles, now });
  assert.ok(plan.find((r) => r.id.includes("hers"))?.body.includes("Maria"));
  assert.ok(!plan.find((r) => r.id.includes("mine"))?.body.includes("Maria"));
});

// --- month overview (the calendar's dots) --------------------------------------------------------
test("month overview: counts doses, taken, missed and visits per local day", () => {
  const now = local(2026, 9, 26, 12, 0); // midday on the 26th
  const m = med({ endDate: "2026-09-27" }); // 25, 26, 27 — three doses each
  const logs: DoseLog[] = [
    { id: "a", medicationId: "m1", scheduledAt: local(2026, 9, 25, 8).toISOString().replace("Z", "+00:00"), status: "taken", loggedAt: null },
    { id: "b", medicationId: "m1", scheduledAt: local(2026, 9, 25, 14).toISOString(), status: "skipped", loggedAt: null },
  ];
  const visit: Appointment = {
    id: "v", profileId: "p1", providerName: "Dr. Patel", specialty: null, location: null,
    scheduledAt: local(2026, 9, 26, 10, 0).toISOString(), preVisitNotes: null, postVisitNotes: null,
  };
  const o = buildMonthOverview({ medications: [m], appointments: [visit], logs, rangeStart: local(2026, 9, 1), rangeEnd: local(2026, 9, 30, 23, 59), now });

  assert.deepEqual(o["2026-09-25"], { doses: 3, taken: 1, skipped: 1, missed: 1, visits: 0 }); // 8pm dose unanswered and past
  assert.deepEqual(o["2026-09-26"], { doses: 3, taken: 0, skipped: 0, missed: 1, visits: 1 }); // only the 8am dose has passed at noon
  assert.deepEqual(o["2026-09-27"], { doses: 3, taken: 0, skipped: 0, missed: 0, visits: 0 }); // future, nothing missed
  assert.equal(o["2026-09-28"], undefined); // course over: the calendar is clear
  assert.equal(o["2026-09-24"], undefined); // before it started
});

test("month overview: a late-night dose stays on its own local day", () => {
  const m = med({ recurrenceRule: { type: "times_per_day", count: 1, at: ["23:30"] }, endDate: "2026-09-25" });
  const o = buildMonthOverview({ medications: [m], appointments: [], logs: [], rangeStart: local(2026, 9, 1), rangeEnd: local(2026, 9, 30, 23, 59), now: local(2026, 9, 1) });
  assert.deepEqual(Object.keys(o), ["2026-09-25"]);
});
