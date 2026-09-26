import { startOfLocalDay } from "./dates";
import { getI18n, type I18n } from "../i18n";

/** `date`'s calendar day with `time`'s clock time (local). Used to combine the separate date and time pickers. */
export function withTimeOf(date: Date, time: Date): Date {
  const d = new Date(date);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

/** "Today", "Yesterday", "Tomorrow", otherwise "Mon, Sep 22" — in the current language. */
export function relativeDayLabel(day: Date, now: Date = new Date(), i18n: Pick<I18n, "t" | "fmt"> = getI18n()): string {
  const diff = Math.round((startOfLocalDay(day).getTime() - startOfLocalDay(now).getTime()) / 86400000);
  if (diff === 0) return i18n.t("common.today");
  if (diff === -1) return i18n.t("common.yesterday");
  if (diff === 1) return i18n.t("common.tomorrow");
  return i18n.fmt.dayShort(day);
}
