import type { RecurrenceRule } from "../../lib/recurrence";

/** Human-readable label for a recurrence rule, used in list rows and confirmations. */
export function describeRecurrence(rule: RecurrenceRule): string {
  switch (rule.type) {
    case "interval_hours":
      return `Every ${rule.every}h`;
    case "times_per_day":
      return `${rule.count}x/day`;
    case "weekdays":
      return `${rule.days.length} days/week`;
    case "once":
      return "One time";
  }
}
