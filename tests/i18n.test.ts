import test from "node:test";
import assert from "node:assert/strict";
import { createFormat, createTranslator, interpolate, isRtlLocale, pluralForm, resolveLocale } from "../src/i18n/core";
import { createI18n, en, ur } from "../src/i18n";

test("language choice: explicit wins; 'system' takes the first supported device language, else English", () => {
  assert.equal(resolveLocale("en", ["ur-PK"]), "en");
  assert.equal(resolveLocale("ur", ["en-US"]), "ur");
  assert.equal(resolveLocale("system", ["ur-PK", "en-US"]), "ur");
  assert.equal(resolveLocale("system", ["fr-FR", "ur"]), "ur", "skips unsupported languages");
  assert.equal(resolveLocale("system", ["fr-FR", "de-DE"]), "en");
  assert.equal(resolveLocale("system", []), "en");
  assert.equal(resolveLocale("system", ["UR_pk"]), "ur", "case and separator don't matter");
  assert.ok(isRtlLocale("ur") && !isRtlLocale("en"));
});

test("interpolation fills placeholders and leaves unknown ones visible", () => {
  assert.equal(interpolate("Hi {name}, {n} left", { name: "Sara", n: 3 }), "Hi Sara, 3 left");
  assert.equal(interpolate("Hi {name}", {}), "Hi {name}");
  assert.equal(interpolate("No params"), "No params");
  assert.equal(interpolate("{a}{a}", { a: "x" }), "xx");
});

test("plurals: 'one' only for exactly 1; falls back to _other, then English, then the key", () => {
  assert.equal(pluralForm("en", 1), "one");
  assert.equal(pluralForm("en", 0), "other");
  assert.equal(pluralForm("ur", 2), "other");
  const fallback = { "x_one": "{count} thing", "x_other": "{count} things", "y_other": "{count} ys" };
  const tr = createTranslator("ur", { "x_other": "{count} چیزیں" }, fallback);
  assert.equal(tr.tn("x", 5), "5 چیزیں");
  assert.equal(tr.tn("x", 1), "1 چیزیں", "no _one in Urdu → uses its _other rather than English");
  assert.equal(tr.tn("y", 1), "1 ys", "missing entirely → English");
  assert.equal(tr.tn("nope", 2), "nope");
  assert.equal(tr.t("nope"), "nope", "a missing key shows the key, never crashes");
});

test("Urdu dates and times use Urdu names with Western digits", () => {
  const f = createFormat("ur");
  const sat = new Date(2026, 8, 26, 20, 5); // Saturday 26 Sep 2026, 8:05 PM
  assert.equal(f.dayFull(sat), "ہفتہ، 26 ستمبر");
  assert.equal(f.monthYear(sat), "ستمبر 2026");
  assert.equal(f.dateMedium(sat), "26 ستمبر 2026");
  assert.equal(f.dateFull(sat), "ہفتہ، 26 ستمبر 2026");
  assert.equal(f.time(sat), "8:05 شام");
  assert.equal(f.clock({ hour: 0, minute: 0 }), "12:00 صبح");
  assert.equal(f.clock({ hour: 12, minute: 30 }), "12:30 شام");
  assert.equal(f.weekdayName(0, "long"), "اتوار");
  assert.equal(f.weekdayName(6, "narrow"), "ہفتہ");
  assert.equal(f.dateTimeMedium(sat), "26 ستمبر 2026، 8:05 شام");
});

test("English formatting keeps the device's wording (and the app's 12-hour picker clock)", () => {
  const f = createFormat("en");
  const d = new Date(2026, 8, 26, 20, 5);
  assert.ok(f.dayFull(d).includes("26") && f.dayFull(d).includes("Saturday"));
  assert.ok(f.monthYear(d).includes("2026"));
  assert.equal(f.clock({ hour: 20, minute: 5 }), "8:05 PM");
  assert.equal(f.weekdayName(0, "long"), "Sunday");
});

// --- the guard that keeps translations from drifting -------------------------------------------------
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

test("every English message exists in Urdu, non-empty, with identical {placeholders}", () => {
  const enKeys = Object.keys(en).sort();
  const urKeys = Object.keys(ur).sort();
  assert.deepEqual(urKeys.filter((k) => !enKeys.includes(k)), [], "keys only in Urdu");
  assert.deepEqual(enKeys.filter((k) => !urKeys.includes(k)), [], "keys missing in Urdu");
  for (const key of enKeys) {
    const e = (en as Record<string, string>)[key];
    const u = (ur as Record<string, string>)[key];
    assert.ok(u.trim().length > 0, `${key} is empty in Urdu`);
    assert.equal(placeholders(u), placeholders(e), `${key}: placeholders differ ("${e}" vs "${u}")`);
  }
});

test("plural messages always come as a complete _one/_other pair", () => {
  for (const [name, dict] of [["en", en], ["ur", ur]] as const) {
    const keys = Object.keys(dict);
    for (const k of keys.filter((x) => x.endsWith("_one"))) assert.ok(keys.includes(k.replace(/_one$/, "_other")), `${name}: ${k} has no _other`);
    for (const k of keys.filter((x) => x.endsWith("_other"))) assert.ok(keys.includes(k.replace(/_other$/, "_one")), `${name}: ${k} has no _one`);
  }
});

test("the typed translator resolves real keys in both languages", () => {
  assert.equal(createI18n("en").t("common.cancel"), "Cancel");
  assert.equal(createI18n("ur").t("common.cancel"), "منسوخ کریں");
  assert.equal(createI18n("ur").isRTL, true);
});

// --- the helpers that build user-facing text, in Urdu -----------------------------------------------
import { describeCourse } from "../src/features/medications/describeCourse";
import { describeRecurrence, describeRecurrenceTimes } from "../src/features/medications/describeRecurrence";
import { refillHeadline, refillStatus } from "../src/features/medications/refill";
import { formatDuration, exerciseTitle } from "../src/features/exercise/logic";
import { mealLabel } from "../src/features/nutrition/constants";
import { summarizeLogs } from "../src/features/lifestyle/logic";
import { buildMissedDoseMessage, relationshipLabel, tellLabel } from "../src/features/guardians/logic";
import { relativeDayLabel } from "../src/lib/dayTime";
import type { Guardian, Medication } from "../src/types/domain";

const urdu = createI18n("ur");
const english = createI18n("en");
const testMed = (over: Partial<Medication> = {}): Medication => ({
  id: "m1", profileId: "p1", name: "Amoxicillin", dosage: "500mg", instructions: null,
  recurrenceRule: { type: "times_per_day", count: 3, at: ["08:00", "14:00", "20:00"] },
  quantityOnHand: null, refillThreshold: null, startDate: "2026-09-01", endDate: null, archivedAt: null, createdAt: "2026-09-01T00:00:00.000Z", ...over,
});

test("medication wording follows the language: course status, schedule, times, refill", () => {
  const now = new Date(2026, 8, 25, 10, 0);
  assert.equal(describeCourse(testMed(), now, urdu).status, "جاری");
  assert.equal(describeCourse(testMed({ endDate: "2026-09-29" }), now, urdu).status, "5 دن باقی");
  assert.equal(describeCourse(testMed({ endDate: "2026-09-25" }), now, urdu).status, "آخری دن");
  assert.equal(describeCourse(testMed({ endDate: "2026-09-29" }), now, english).kind, "daysLeft", "logic uses kind, not the wording");
  assert.equal(describeRecurrence(testMed().recurrenceRule, urdu), "دن میں 3 بار");
  assert.equal(describeRecurrenceTimes(testMed().recurrenceRule, urdu), "8:00 صبح، 2:00 شام، 8:00 شام");
  assert.equal(describeRecurrenceTimes(testMed().recurrenceRule, english), "8:00 AM, 2:00 PM, 8:00 PM");
  const low = refillStatus(testMed({ quantityOnHand: 8 }), now)!;
  assert.equal(refillHeadline(low, urdu), "تقریباً 2 دن باقی");
  assert.equal(refillHeadline(refillStatus(testMed({ quantityOnHand: 0 }), now)!, urdu), "ختم — دوبارہ خریدنا ہوگا");
});

test("durations, meals, exercise and day summaries in Urdu", () => {
  assert.equal(formatDuration(30, urdu), "30 منٹ");
  assert.equal(formatDuration(60, urdu), "1 گھنٹہ");
  assert.equal(formatDuration(90, urdu), "1 گھنٹہ 30 منٹ");
  assert.equal(mealLabel("breakfast", urdu), "ناشتہ");
  assert.equal(exerciseTitle({ name: null, exerciseType: "walking" }, urdu), "چہل قدمی");
  assert.equal(exerciseTitle({ name: "Badminton", exerciseType: "other" }, urdu), "Badminton", "a name the person typed is never translated");
  assert.deepEqual(summarizeLogs([{ id: "a" }, { id: "b" }], [{ durationMinutes: 45 }], urdu), ["2 کھانے", "45 منٹ فعال"]);
});

test("guardian text in Urdu: button, relationship, and the message that gets sent", () => {
  const g = (name: string): Guardian => ({ id: name, profileId: "p1", name, relationship: null, phone: "+15551234567", notifyOnMissed: true });
  assert.equal(tellLabel([g("امی جان")], urdu), "امی کو بتائیں", "first name only");
  assert.equal(tellLabel([g("Mom"), g("Dad")], urdu), "نگرانوں کو بتائیں");
  assert.equal(relationshipLabel("Parent", urdu), "والدین");
  assert.equal(relationshipLabel("Neighbour", urdu), "Neighbour", "a value we don't know is shown as stored");
  const at = new Date(2026, 8, 25, 8, 0);
  assert.equal(buildMissedDoseMessage({ patientName: null, medicationName: "Amoxicillin", dosage: "500mg", scheduledAt: at }, urdu), "مجھ سے Amoxicillin (500mg) کی 8:00 صبح کی خوراک رہ گئی۔ میڈیولر سے بھیجا گیا۔");
  assert.ok(buildMissedDoseMessage({ patientName: "ابو", medicationName: "X", dosage: "1", scheduledAt: at }, urdu).startsWith("ابو سے X"));
});

test("relative day names in Urdu", () => {
  const now = new Date(2026, 8, 25, 12, 0);
  assert.equal(relativeDayLabel(new Date(2026, 8, 25, 1, 0), now, urdu), "آج");
  assert.equal(relativeDayLabel(new Date(2026, 8, 24, 1, 0), now, urdu), "گزشتہ کل");
  assert.equal(relativeDayLabel(new Date(2026, 8, 26, 1, 0), now, urdu), "آئندہ کل");
  assert.equal(relativeDayLabel(new Date(2026, 8, 20, 1, 0), now, urdu), "اتوار، 20 ستمبر");
});
