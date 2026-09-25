import { endOfLocalDay, parseLocalDate } from "../../lib/dates";
import { occurrencesInRange, type RecurrenceRule } from "../../lib/recurrence";
import { isActiveMedication } from "./schedule";
import type { Medication } from "../../types/domain";

/** Average doses per day for a schedule (weekly and interval schedules average out). */
export function dosesPerDay(rule: RecurrenceRule): number {
  switch (rule.type) {
    case "times_per_day":
      return rule.at.length;
    case "weekdays":
      return (rule.at.length * rule.days.length) / 7;
    case "interval_hours":
      return rule.every > 0 ? 24 / rule.every : 0;
    case "once":
      return 0;
  }
}

/** Warn when about three days of doses are left (at least one). */
export function defaultRefillThreshold(rule: RecurrenceRule): number {
  return Math.max(1, Math.ceil(dosesPerDay(rule) * 3));
}

export interface RefillStatus {
  remaining: number;
  /** Whole days the remaining supply lasts, or null when the schedule has no steady rate. */
  daysLeft: number | null;
  threshold: number;
  low: boolean;
  empty: boolean;
}

/**
 * Supply status for a medication that tracks quantity, or null when it doesn't (or is no longer being taken).
 * A course that will end before the supply runs out never asks for a refill.
 */
export function refillStatus(med: Medication, now: Date = new Date()): RefillStatus | null {
  if (med.quantityOnHand == null || !isActiveMedication(med, now)) return null;
  const remaining = Math.max(0, med.quantityOnHand);
  const perDay = dosesPerDay(med.recurrenceRule);
  const threshold = med.refillThreshold ?? defaultRefillThreshold(med.recurrenceRule);
  const daysLeft = perDay > 0 ? Math.floor(remaining / perDay) : null;

  if (med.endDate) {
    const dosesLeftInCourse = occurrencesInRange(med.recurrenceRule, now, endOfLocalDay(parseLocalDate(med.endDate))).length;
    if (remaining >= dosesLeftInCourse) return { remaining, daysLeft, threshold, low: false, empty: false };
  }
  return { remaining, daysLeft, threshold, low: remaining <= threshold, empty: remaining <= 0 };
}

/** "Out — refill needed" / "About 2 days left" style wording for a low supply. */
export function refillHeadline(status: RefillStatus): string {
  if (status.empty) return "Out — refill needed";
  if (status.daysLeft === 0) return "Less than a day left";
  if (status.daysLeft != null) return `About ${status.daysLeft} ${status.daysLeft === 1 ? "day" : "days"} left`;
  return `${status.remaining} left`;
}
