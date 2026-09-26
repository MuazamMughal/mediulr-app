import type { RecurrenceRule } from "../../lib/recurrence";
import { parseHHMM } from "../../lib/timeParts";
import { getI18n, type I18n } from "../../i18n";

/** Human-readable label for a recurrence rule, used in list rows and confirmations (in the current language). */
export function describeRecurrence(rule: RecurrenceRule, { t }: I18n = getI18n()): string {
  switch (rule.type) {
    case "interval_hours":
      return t("recurrence.everyHours", { n: rule.every });
    case "times_per_day":
      return t("recurrence.timesPerDay", { n: rule.count });
    case "weekdays":
      return t("recurrence.daysPerWeek", { n: rule.days.length });
    case "once":
      return t("recurrence.oneTime");
    case "monthly":
      return t("recurrence.monthly");
    case "every_n_days":
      return t("recurrence.everyDays", { n: rule.every });
  }
}

/** The actual clock times a rule fires at, for display (e.g. "8:00 AM, 2:00 PM, 8:00 PM"). */
export function describeRecurrenceTimes(rule: RecurrenceRule, { fmt, locale }: I18n = getI18n()): string | null {
  const sep = locale === "ur" ? "، " : ", ";
  switch (rule.type) {
    case "times_per_day":
    case "weekdays":
    case "monthly":
    case "every_n_days":
      return rule.at.map((time) => fmt.clock(parseHHMM(time))).join(sep);
    case "once":
      return fmt.time(new Date(rule.at));
    case "interval_hours":
      return null;
  }
}
