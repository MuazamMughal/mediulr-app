import { daysLeft, parseLocalDate } from "../../lib/dates";
import { getI18n, type I18n } from "../../i18n";
import { isActiveMedication } from "./schedule";
import type { Medication } from "../../types/domain";

export type CourseKind = "ongoing" | "daysLeft" | "lastDay" | "finished" | "stopped";

export interface CourseSummary {
  /** Which situation this is — for logic; `status` is the wording for people. */
  kind: CourseKind;
  /** Short status for list rows and headers: "Ongoing", "3 days left", "Finished", "Stopped" (in the current language). */
  status: string;
  /** The treatment dates, or null when ongoing. */
  range: string | null;
  active: boolean;
}

export function describeCourse(med: Medication, now: Date = new Date(), i18n: I18n = getI18n()): CourseSummary {
  const { t, tn, fmt } = i18n;
  const active = isActiveMedication(med, now);
  const start = parseLocalDate(med.startDate);
  const range = med.endDate ? `${fmt.monthDayShort(start)} – ${fmt.monthDayShort(parseLocalDate(med.endDate))}` : null;

  if (med.archivedAt) return { kind: "stopped", status: t("course.stopped"), range, active };
  if (!active) return { kind: "finished", status: t("course.finished"), range, active };

  const left = daysLeft(med.endDate, now);
  if (left === null) return { kind: "ongoing", status: t("course.ongoing"), range, active };
  return left === 1
    ? { kind: "lastDay", status: t("course.lastDay"), range, active }
    : { kind: "daysLeft", status: tn("course.daysLeft", left), range, active };
}
