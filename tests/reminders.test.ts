import test from "node:test";
import assert from "node:assert/strict";
import { occurrencesInRange } from "../src/lib/recurrence";
import { nextOccurrence, reminderKey, reminderOccurrences, reminderWindow, remindersInRange } from "../src/features/reminders/schedule";
import type { CustomReminder } from "../src/types/domain";

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);
const ymd = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

function reminder(over: Partial<CustomReminder> = {}): CustomReminder {
  return {
    id: "r1", profileId: "p1", title: "Check blood pressure", notes: null,
    recurrenceRule: { type: "times_per_day", count: 1, at: ["08:00"] },
    startDate: "2026-09-01", endDate: null, createdAt: "2026-09-01T00:00:00.000Z", ...over,
  };
}

// --- monthly -------------------------------------------------------------------------------------
test("monthly: fires on the chosen day of each month at each time", () => {
  const rule = { type: "monthly" as const, day: 15, at: ["09:00", "18:30"] };
  const got = occurrencesInRange(rule, local(2026, 9, 1), local(2026, 11, 30, 23, 59)).map(ymd);
  assert.deepEqual(got, ["9/15 9:00", "9/15 18:30", "10/15 9:00", "10/15 18:30", "11/15 9:00", "11/15 18:30"]);
});

test("monthly: the 31st falls back to the last day of shorter months (including leap-year February)", () => {
  const rule = { type: "monthly" as const, day: 31, at: ["08:00"] };
  const got = occurrencesInRange(rule, local(2027, 1, 1), local(2027, 4, 30, 23, 59)).map(ymd);
  assert.deepEqual(got, ["1/31 8:00", "2/28 8:00", "3/31 8:00", "4/30 8:00"]);
  const leap = occurrencesInRange(rule, local(2028, 2, 1), local(2028, 2, 29, 23, 59)).map(ymd);
  assert.deepEqual(leap, ["2/29 8:00"]);
});

test("monthly: honours the range edges and rejects nonsense days", () => {
  const rule = { type: "monthly" as const, day: 10, at: ["08:00"] };
  assert.deepEqual(occurrencesInRange(rule, local(2026, 9, 10, 8, 1), local(2026, 10, 10, 7, 59)).map(ymd), [], "just after and just before");
  assert.deepEqual(occurrencesInRange(rule, local(2026, 9, 10, 8, 0), local(2026, 9, 10, 8, 0)).map(ymd), ["9/10 8:00"], "inclusive");
  for (const day of [0, 32, -1, NaN]) assert.deepEqual(occurrencesInRange({ type: "monthly", day, at: ["08:00"] }, local(2026, 9, 1), local(2026, 12, 31)), [], `day ${day}`);
});

// --- every N days --------------------------------------------------------------------------------
test("every N days: counts from the anchor date, never before it", () => {
  const rule = { type: "every_n_days" as const, every: 3, from: "2026-09-10", at: ["07:00"] };
  const got = occurrencesInRange(rule, local(2026, 9, 1), local(2026, 9, 25, 23, 59)).map(ymd);
  assert.deepEqual(got, ["9/10 7:00", "9/13 7:00", "9/16 7:00", "9/19 7:00", "9/22 7:00", "9/25 7:00"]);
  assert.deepEqual(occurrencesInRange(rule, local(2026, 9, 1), local(2026, 9, 9, 23, 59)), [], "nothing before the anchor");
});

test("every N days: a range that starts mid-cycle still lines up with the anchor", () => {
  const rule = { type: "every_n_days" as const, every: 7, from: "2026-01-05", at: ["09:00"] };
  const got = occurrencesInRange(rule, local(2026, 9, 1), local(2026, 9, 30, 23, 59)).map(ymd);
  assert.deepEqual(got, ["9/7 9:00", "9/14 9:00", "9/21 9:00", "9/28 9:00"]);
});

test("every N days: stays on the same clock time across a daylight-saving change", () => {
  // In a DST timezone (run with TZ=America/Los_Angeles) 8 Mar 2026 has only 23 hours; the maths must not drift by a day.
  const rule = { type: "every_n_days" as const, every: 2, from: "2026-03-01", at: ["08:00"] };
  const got = occurrencesInRange(rule, local(2026, 3, 1), local(2026, 3, 13, 23, 59)).map(ymd);
  assert.deepEqual(got, ["3/1 8:00", "3/3 8:00", "3/5 8:00", "3/7 8:00", "3/9 8:00", "3/11 8:00", "3/13 8:00"]);
});

test("every N days: bad intervals produce nothing instead of looping", () => {
  for (const every of [0, -2, NaN]) assert.deepEqual(occurrencesInRange({ type: "every_n_days", every, from: "2026-09-01", at: ["08:00"] }, local(2026, 9, 1), local(2026, 9, 30)), [], `every ${every}`);
});

// --- windows and completion ----------------------------------------------------------------------
test("a repeating reminder starts no earlier than it was created (no phantom overdue at 8am when added at 3pm)", () => {
  const r = reminder({ startDate: "2026-09-25", createdAt: local(2026, 9, 25, 15, 0).toISOString() });
  const got = reminderOccurrences(r, local(2026, 9, 25), local(2026, 9, 26, 23, 59)).map(ymd);
  assert.deepEqual(got, ["9/26 8:00"]);
});

test("a repeating reminder ends at the end of its last day", () => {
  const r = reminder({ startDate: "2026-09-01", endDate: "2026-09-03", createdAt: local(2026, 9, 1).toISOString() });
  const got = reminderOccurrences(r, local(2026, 9, 1), local(2026, 9, 10)).map(ymd);
  assert.deepEqual(got, ["9/1 8:00", "9/2 8:00", "9/3 8:00"]);
});

test("a one-off reminder has its own time, even one already past, and no window", () => {
  const at = local(2026, 9, 20, 10, 30).toISOString();
  const r = reminder({ recurrenceRule: { type: "once", at }, createdAt: local(2026, 9, 25).toISOString() });
  assert.deepEqual(reminderWindow(r), {});
  assert.deepEqual(reminderOccurrences(r, local(2026, 9, 20), local(2026, 9, 21)).map(ymd), ["9/20 10:30"]);
});

test("completions mark occurrences done, matching instants across '+00:00' and 'Z' spellings, sorted by time", () => {
  const a = reminder({ id: "a", recurrenceRule: { type: "times_per_day", count: 2, at: ["08:00", "20:00"] }, createdAt: local(2026, 9, 1).toISOString() });
  const b = reminder({ id: "b", title: "Other", recurrenceRule: { type: "times_per_day", count: 1, at: ["12:00"] }, createdAt: local(2026, 9, 1).toISOString() });
  const eight = local(2026, 9, 25, 8, 0);
  const completions = [{ reminderId: "a", scheduledAt: eight.toISOString().replace("Z", "+00:00"), completedAt: "x" }];
  const got = remindersInRange([a, b], local(2026, 9, 25), local(2026, 9, 25, 23, 59), completions);
  assert.deepEqual(got.map((o) => [o.reminder.id, o.done]), [["a", true], ["b", false], ["a", false]]);
  assert.equal(reminderKey("a", "2026-09-25T03:00:00+00:00"), reminderKey("a", "2026-09-25T03:00:00.000Z"));
});

test("next occurrence: soonest future one, or null once a reminder can never fire again", () => {
  const now = local(2026, 9, 25, 9, 0);
  assert.equal(ymd(nextOccurrence(reminder({ createdAt: local(2026, 9, 1).toISOString() }), now)!), "9/26 8:00");
  const finished = reminder({ startDate: "2026-09-01", endDate: "2026-09-10", createdAt: local(2026, 9, 1).toISOString() });
  assert.equal(nextOccurrence(finished, now), null);
  const pastOnce = reminder({ recurrenceRule: { type: "once", at: local(2026, 9, 1, 8).toISOString() } });
  assert.equal(nextOccurrence(pastOnce, now), null);
  const monthly = reminder({ recurrenceRule: { type: "monthly", day: 3, at: ["08:00"] }, createdAt: local(2026, 1, 1).toISOString(), startDate: "2026-01-01" });
  assert.equal(ymd(nextOccurrence(monthly, now)!), "10/3 8:00");
  const rare = reminder({ recurrenceRule: { type: "every_n_days", every: 365, from: "2026-01-01", at: ["09:00"] }, createdAt: local(2026, 1, 1).toISOString(), startDate: "2026-01-01" });
  assert.equal(ymd(nextOccurrence(rare, now)!), "1/1 9:00", "a yearly reminder is found");
});

// --- wording, notifications and the timeline -----------------------------------------------------------
import { describeReminderSchedule } from "../src/features/reminders/describe";
import { createI18n } from "../src/i18n";
import { planReminders } from "../src/features/notifications/plan";
import { parseReminderData, isDoseNotificationId } from "../src/features/notifications/actions";
import { buildMonthLogs, mergeTimeline } from "../src/features/lifestyle/logic";
import type { CalendarEvent, Profile } from "../src/types/domain";

const en = createI18n("en");
const ur = createI18n("ur");

test("schedules are described in plain words, in both languages", () => {
  const daily = describeReminderSchedule({ type: "times_per_day", count: 2, at: ["08:00", "20:30"] }, en);
  assert.equal(daily, "Every day at 8:00 AM, 8:30 PM");
  assert.equal(describeReminderSchedule({ type: "times_per_day", count: 2, at: ["08:00", "20:30"] }, ur), "ہر روز 8:00 صبح، 8:30 شام بجے");
  const weekly = describeReminderSchedule({ type: "weekdays", days: ["wed", "mon"], at: ["07:00"] }, en);
  assert.ok(weekly.startsWith("Every Mon, Wed at 7:00 AM"), weekly + " — days in week order, not click order");
  assert.equal(describeReminderSchedule({ type: "monthly", day: 15, at: ["09:00"] }, en), "Monthly on day 15 at 9:00 AM");
  assert.equal(describeReminderSchedule({ type: "monthly", day: 15, at: ["09:00"] }, ur), "ہر ماہ 15 تاریخ کو 9:00 صبح بجے");
  assert.equal(describeReminderSchedule({ type: "every_n_days", every: 3, from: "2026-09-01", at: ["07:00"] }, en), "Every 3 days at 7:00 AM");
  assert.equal(describeReminderSchedule({ type: "every_n_days", every: 1, from: "2026-09-01", at: ["07:00"] }, en), "Every day at 7:00 AM", "every 1 day reads as daily");
  assert.ok(describeReminderSchedule({ type: "once", at: local(2026, 9, 28, 10, 0).toISOString() }, en).startsWith("Once · "));
});

test("plan: custom reminders get notifications with Done/Snooze data, skipping ticked-off ones", () => {
  const now = local(2026, 9, 25, 9, 0);
  const me: Profile = { id: "p1", ownerId: "u", isSelf: true, displayName: "Me", dateOfBirth: null };
  const r = reminder({ id: "bp", title: "Check blood pressure", notes: "Sit for 5 minutes first", recurrenceRule: { type: "times_per_day", count: 1, at: ["18:00"] }, createdAt: local(2026, 9, 1).toISOString() });
  const p = planReminders({ medications: [], appointments: [], profiles: [me], now, customReminders: [r] });
  assert.equal(p.length, 7, "one a day for the week (25 Sep to 1 Oct at 6pm)");
  const first = p[0];
  assert.equal(first.id, `custom:bp:${local(2026, 9, 25, 18, 0).getTime()}`);
  assert.equal(first.title, "Check blood pressure");
  assert.equal(first.body, "Sit for 5 minutes first");
  assert.equal(first.category, "reminder");
  const data = parseReminderData(first.data)!;
  assert.deepEqual([data.reminderId, data.title, data.patientName], ["bp", "Check blood pressure", null]);
  const skipped = planReminders({ medications: [], appointments: [], profiles: [me], now, customReminders: [r], completedReminders: new Set([reminderKey("bp", local(2026, 9, 25, 18, 0))]) });
  assert.ok(!skipped.some((x) => x.id.endsWith(String(local(2026, 9, 25, 18, 0).getTime()))), "a ticked-off occurrence gets no notification");
  assert.equal(skipped.length, p.length - 1);
  const noNotes = planReminders({ medications: [], appointments: [], profiles: [me], now, customReminders: [{ ...r, notes: null }] });
  assert.equal(noNotes[0].body, "Time for your reminder");
  const urdu = planReminders({ medications: [], appointments: [], profiles: [me], now, customReminders: [{ ...r, notes: null }], i18n: ur });
  assert.equal(urdu[0].body, "آپ کی یاد دہانی کا وقت ہو گیا", "notification text follows the language");
});

test("plan: a reminder for a family member names them", () => {
  const dad: Profile = { id: "p2", ownerId: "u", isSelf: false, displayName: "Dad", dateOfBirth: null };
  const r = reminder({ profileId: "p2", recurrenceRule: { type: "once", at: local(2026, 9, 26, 10, 0).toISOString() } });
  const p = planReminders({ medications: [], appointments: [], profiles: [dad], now: local(2026, 9, 25, 9, 0), customReminders: [r] });
  assert.equal(p[0].body, "Time for your reminder · Dad");
  assert.equal(parseReminderData(p[0].data)!.patientName, "Dad");
});

test("reminder notification data: malformed payloads are ignored; a Done tap clears that occurrence's notifications only", () => {
  for (const bad of [undefined, null, {}, { kind: "dose" }, { kind: "reminder" }, { kind: "reminder", reminderId: "r", scheduledAt: "nope", profileId: "p", title: "t" }]) assert.equal(parseReminderData(bad), null);
  const ms = 1_700_000_000_000;
  assert.ok(isDoseNotificationId(`custom:r1:${ms}`, "r1", ms));
  assert.ok(isDoseNotificationId(`snooze:r1:${ms}:5`, "r1", ms));
  assert.ok(!isDoseNotificationId(`custom:r1:${ms + 1}`, "r1", ms));
  assert.ok(!isDoseNotificationId(`custom:r2:${ms}`, "r1", ms));
});

test("reminders appear on the timeline in time order and on the month grid", () => {
  const r = reminder({ recurrenceRule: { type: "times_per_day", count: 1, at: ["12:00"] }, createdAt: local(2026, 9, 1).toISOString() });
  const base: CalendarEvent[] = [{ kind: "custom", at: local(2026, 9, 25, 8, 0).toISOString(), title: "a", notes: null }, { kind: "custom", at: local(2026, 9, 25, 20, 0).toISOString(), title: "b", notes: null }];
  const occ = remindersInRange([r], local(2026, 9, 25), local(2026, 9, 25, 23, 59), []);
  const merged = mergeTimeline(base, [], [], occ);
  assert.deepEqual(merged.map((e) => e.kind), ["custom", "reminder", "custom"]);
  assert.equal(mergeTimeline(base, [], [], []), base, "nothing to add → untouched");
  const logs = buildMonthLogs([], [], [local(2026, 9, 25, 12, 0).toISOString(), local(2026, 9, 25, 13, 0).toISOString()]);
  assert.deepEqual(logs["2026-09-25"], { meals: 0, activities: 0, reminders: 2 });
});
