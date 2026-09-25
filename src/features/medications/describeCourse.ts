import { daysLeft, parseLocalDate } from "../../lib/dates";
import { isActiveMedication } from "./schedule";
import type { Medication } from "../../types/domain";

function shortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export interface CourseSummary {
  /** Short status for list rows and headers: "Ongoing", "3 days left", "Finished", "Stopped". */
  status: string;
  /** The treatment dates, or null when ongoing. */
  range: string | null;
  active: boolean;
}

export function describeCourse(med: Medication, now: Date = new Date()): CourseSummary {
  const active = isActiveMedication(med, now);
  const start = parseLocalDate(med.startDate);
  const range = med.endDate ? `${shortDate(start)} – ${shortDate(parseLocalDate(med.endDate))}` : null;

  if (med.archivedAt) return { status: "Stopped", range, active };
  if (!active) return { status: "Finished", range, active };

  const left = daysLeft(med.endDate, now);
  if (left === null) return { status: "Ongoing", range, active };
  return { status: left === 1 ? "Last day" : `${left} days left`, range, active };
}
