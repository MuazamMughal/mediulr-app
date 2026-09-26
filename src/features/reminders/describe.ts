import { parseHHMM } from "../../lib/timeParts";
import type { RecurrenceRule, Weekday } from "../../lib/recurrence";
import type { I18n } from "../../i18n";

export const WEEKDAY_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const JS_DAY: Record<Weekday, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
export const weekdayIndex = (d: Weekday) => JS_DAY[d];

/** "Every day at 8:00 AM, 8:00 PM" / "Every Mon, Wed at 8:00 AM" / "Monthly on day 15 at 9:00 AM" … in the current language. */
export function describeReminderSchedule(rule: RecurrenceRule, i18n: I18n): string {
  const { t, fmt, locale } = i18n;
  const sep = locale === "ur" ? "، " : ", ";
  const times = (at: string[]) => at.map((x) => fmt.clock(parseHHMM(x))).join(sep);
  switch (rule.type) {
    case "once":
      return t("reminders.sched.once", { when: fmt.dateTimeMedium(new Date(rule.at)) });
    case "times_per_day":
      return t("reminders.sched.daily", { times: times(rule.at) });
    case "weekdays": {
      const ordered = WEEKDAY_ORDER.filter((d) => rule.days.includes(d));
      return t("reminders.sched.weekly", { days: ordered.map((d) => fmt.weekdayName(JS_DAY[d], "short")).join(sep), time: times(rule.at) });
    }
    case "monthly":
      return t("reminders.sched.monthly", { day: rule.day, time: times(rule.at) });
    case "every_n_days":
      return rule.every === 1
        ? t("reminders.sched.daily", { times: times(rule.at) })
        : t("reminders.sched.everyN", { n: rule.every, time: times(rule.at) });
    case "interval_hours":
      return t("reminders.sched.everyN", { n: rule.every, time: "" }).trim();
  }
}
