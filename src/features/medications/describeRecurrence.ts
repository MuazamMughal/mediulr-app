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

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** The actual clock times a rule fires at, for display (e.g. "8:00 AM, 2:00 PM, 8:00 PM"). */
export function describeRecurrenceTimes(rule: RecurrenceRule): string | null {
  switch (rule.type) {
    case "times_per_day":
    case "weekdays":
      return rule.at.map(formatTime).join(", ");
    case "once":
      return new Date(rule.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    case "interval_hours":
      return null;
  }
}
