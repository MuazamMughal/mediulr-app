import test from "node:test";
import assert from "node:assert/strict";
import { alertGuardians, buildMissedDoseMessage, isValidPhone, normalizePhone, smsUrl, tellLabel } from "../src/features/guardians/logic";
import type { Guardian } from "../src/types/domain";

const g = (name: string, notifyOnMissed = true): Guardian => ({
  id: name, profileId: "p1", name, relationship: null, phone: "+15551234567", notifyOnMissed,
});

test("phone normalisation strips formatting and keeps one leading +", () => {
  assert.equal(normalizePhone("(555) 123-4567"), "5551234567");
  assert.equal(normalizePhone(" +1 555 123 4567 "), "+15551234567");
  assert.equal(normalizePhone("+92-300-1234567"), "+923001234567");
  assert.equal(normalizePhone("555.123.4567 ext"), "5551234567");
});

test("phone validation: 7-15 digits, mirrors the database check", () => {
  for (const ok of ["5551234", "+15551234567", "(555) 123-4567", "+923001234567", "123456789012345"]) assert.ok(isValidPhone(ok), ok);
  for (const bad of ["", "  ", "12345", "abcdefg", "1234567890123456", "+", "call me"]) assert.ok(!isValidPhone(bad), bad);
});

test("only guardians with alerts on are offered", () => {
  assert.deepEqual(alertGuardians([g("Mom"), g("Dad", false)]).map((x) => x.name), ["Mom"]);
  assert.deepEqual(alertGuardians(undefined), []);
});

test("button label: first name for one guardian, generic for several", () => {
  assert.equal(tellLabel([g("Sarah Khan")]), "Tell Sarah");
  assert.equal(tellLabel([g("Mom"), g("Dad")]), "Tell guardians");
});

test("missed-dose message names the medication and time, and the patient only when it's someone else", () => {
  const at = new Date(2026, 8, 25, 8, 0);
  const self = buildMissedDoseMessage({ patientName: null, medicationName: "Amoxicillin", dosage: "500mg", scheduledAt: at });
  assert.match(self, /^I missed the .*8.*dose of Amoxicillin \(500mg\)\. Sent from Mediulr\.$/);
  const other = buildMissedDoseMessage({ patientName: "Dad", medicationName: "Amoxicillin", dosage: "500mg", scheduledAt: at });
  assert.ok(other.startsWith("Dad missed the"));
});

test("sms link: platform separator, comma-joined recipients, encoded body", () => {
  const body = "I missed it & I'm sorry";
  assert.equal(smsUrl(["+1555"], body, "ios"), `sms:+1555&body=${encodeURIComponent(body)}`);
  assert.equal(smsUrl(["+1555", "+1666"], body, "android"), `sms:+1555,+1666?body=${encodeURIComponent(body)}`);
  assert.ok(!smsUrl(["+1555"], "a&b=c", "android").includes("a&b"), "ampersands in the body are encoded");
});
