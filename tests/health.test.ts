import test from "node:test";
import assert from "node:assert/strict";
import { mealTypeForHour, recentFoods } from "../src/features/nutrition/logic";
import { exerciseTitle, formatDuration, parseCustomMinutes, totalMinutes } from "../src/features/exercise/logic";
import { buildMonthLogs, mergeTimeline, summarizeLogs } from "../src/features/lifestyle/logic";
import { isSameDay, relativeDayLabel, withTimeOf } from "../src/lib/dayTime";
import type { CalendarEvent, ExerciseEntry, FoodEntry } from "../src/types/domain";

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);

function food(name: string, quantity: string | null = null): FoodEntry {
  return { id: name, profileId: "p1", name, mealType: "snack", eatenAt: "2026-09-25T08:00:00.000Z", quantity, notes: null };
}

test("meal type follows the hour, covering the whole day", () => {
  assert.equal(mealTypeForHour(5), "breakfast");
  assert.equal(mealTypeForHour(10), "breakfast");
  assert.equal(mealTypeForHour(11), "lunch");
  assert.equal(mealTypeForHour(14), "lunch");
  assert.equal(mealTypeForHour(15), "snack");
  assert.equal(mealTypeForHour(18), "dinner");
  assert.equal(mealTypeForHour(21), "dinner");
  assert.equal(mealTypeForHour(23), "snack");
  assert.equal(mealTypeForHour(2), "snack");
});

test("recent foods: distinct, case-insensitive, newest first, limited", () => {
  const list = recentFoods([food("Oatmeal", "1 bowl"), food("oatmeal"), food("  Eggs "), food("Apple"), food("")], 3);
  assert.deepEqual(list, [
    { name: "Oatmeal", quantity: "1 bowl" },
    { name: "Eggs", quantity: null },
    { name: "Apple", quantity: null },
  ]);
  assert.deepEqual(recentFoods([]), []);
});

test("duration formatting", () => {
  assert.equal(formatDuration(1), "1 min");
  assert.equal(formatDuration(30), "30 min");
  assert.equal(formatDuration(60), "1 hr");
  assert.equal(formatDuration(90), "1 hr 30 min");
  assert.equal(formatDuration(125), "2 hr 5 min");
});

test("exercise title prefers a custom name, falls back to the type", () => {
  assert.equal(exerciseTitle({ name: "Badminton", exerciseType: "other" }), "Badminton");
  assert.equal(exerciseTitle({ name: null, exerciseType: "walking" }), "Walking");
  assert.equal(exerciseTitle({ name: "  ", exerciseType: "strength" }), "Strength training");
  assert.equal(totalMinutes([{ durationMinutes: 30 }, { durationMinutes: 45 }]), 75);
});

test("month logs group by local day, not UTC day", () => {
  // 23:30 local and 00:30 local the next day land on different days whatever the timezone.
  const late = local(2026, 9, 25, 23, 30).toISOString();
  const early = local(2026, 9, 26, 0, 30).toISOString();
  const logs = buildMonthLogs([late, early, early], [late]);
  assert.deepEqual(logs["2026-09-25"], { meals: 1, activities: 1 });
  assert.deepEqual(logs["2026-09-26"], { meals: 2, activities: 0 });
});

test("day summary is calm and empty when nothing was logged", () => {
  assert.deepEqual(summarizeLogs([], []), []);
  assert.deepEqual(summarizeLogs([{ id: "a" }], []), ["1 meal"]);
  assert.deepEqual(summarizeLogs([{ id: "a" }, { id: "b" }, { id: "c" }], [{ durationMinutes: 30 }, { durationMinutes: 30 }]), [
    "3 meals",
    "1 hr active",
  ]);
});

test("combining a day with a time of day", () => {
  const next = withTimeOf(local(2026, 9, 20, 3, 0), local(2026, 1, 1, 18, 45));
  assert.equal(next.getFullYear(), 2026);
  assert.equal(next.getMonth(), 8);
  assert.equal(next.getDate(), 20);
  assert.equal(next.getHours(), 18);
  assert.equal(next.getMinutes(), 45);
});

test("relative day labels", () => {
  const now = local(2026, 9, 25, 15, 0);
  assert.equal(relativeDayLabel(local(2026, 9, 25, 1, 0), now), "Today");
  assert.equal(relativeDayLabel(local(2026, 9, 24, 23, 59), now), "Yesterday");
  assert.equal(relativeDayLabel(local(2026, 9, 26, 8, 0), now), "Tomorrow");
  assert.notEqual(relativeDayLabel(local(2026, 9, 10, 8, 0), now), "Today");
  assert.ok(isSameDay(local(2026, 9, 25, 0, 0), local(2026, 9, 25, 23, 59)));
  assert.ok(!isSameDay(local(2026, 9, 25, 23, 59), local(2026, 9, 26, 0, 0)));
});

test("custom minutes: whole numbers 1-1440 only", () => {
  assert.equal(parseCustomMinutes("50"), 50);
  assert.equal(parseCustomMinutes("0050"), 50);
  assert.equal(parseCustomMinutes("1440"), 1440);
  for (const bad of ["", " ", "0", "1441", "-5", "3.5", "1e3", "abc", "12 min"]) assert.equal(parseCustomMinutes(bad), null, bad);
});

test("timeline merge interleaves meds, visits, meals and exercise by time, and is a no-op with nothing to add", () => {
  const base: CalendarEvent[] = [
    { kind: "custom", at: "2026-09-25T08:00:00.000Z", title: "8am thing", notes: null },
    { kind: "custom", at: "2026-09-25T19:00:00.000Z", title: "7pm thing", notes: null },
  ];
  assert.equal(mergeTimeline(base, [], undefined), base);
  const meal: FoodEntry = { ...food("Eggs"), eatenAt: "2026-09-25T08:30:00.000Z" };
  const run: ExerciseEntry = {
    id: "e1", profileId: "p1", exerciseType: "walking", name: null,
    startedAt: "2026-09-25T18:00:00.000Z", durationMinutes: 30, intensity: null, notes: null,
  };
  const merged = mergeTimeline(base, [meal], [run]);
  assert.deepEqual(merged.map((e) => e.kind), ["custom", "food", "exercise", "custom"]);
  assert.equal(base.length, 2, "input is not mutated");
});
