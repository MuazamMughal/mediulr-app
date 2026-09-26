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
    for (const k of keys.filter((x) => x.endsWith("_other"))) assert.ok(keys.includes(k.replace(/_other$/, "_one")) || name === "ur", `${name}: ${k} has no _one`);
  }
});

test("the typed translator resolves real keys in both languages", () => {
  assert.equal(createI18n("en").t("common.cancel"), "Cancel");
  assert.equal(createI18n("ur").t("common.cancel"), "منسوخ کریں");
  assert.equal(createI18n("ur").isRTL, true);
});
