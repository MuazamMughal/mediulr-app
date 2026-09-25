/** Notification action buttons: their ids, the categories that carry them, and reading what a tapped notification was about. */

export const DOSE_CATEGORY = "dose";
export const ESCALATE_CATEGORY = "dose_escalate";
export const SNOOZE_MINUTES = 10;

export const ACTION = { take: "take", snooze: "snooze", skip: "skip", tell: "tell" } as const;
export type DoseAction = (typeof ACTION)[keyof typeof ACTION];

/** What a dose notification carries so a button tap knows which dose it means (set in plan.ts). */
export interface DoseNotificationData {
  medicationId: string;
  scheduledAt: string;
  profileId: string;
  medicationName: string;
  dosage: string;
  patientName: string | null;
}

/** Reads notification data defensively: anything missing or malformed means "not a dose notification". */
export function parseDoseData(data: unknown): DoseNotificationData | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.kind !== "dose") return null;
  const text = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);
  const medicationId = text(d.medicationId);
  const scheduledAt = text(d.scheduledAt);
  const profileId = text(d.profileId);
  const medicationName = text(d.medicationName);
  if (!medicationId || !scheduledAt || !profileId || !medicationName || Number.isNaN(new Date(scheduledAt).getTime())) return null;
  return {
    medicationId,
    scheduledAt,
    profileId,
    medicationName,
    dosage: typeof d.dosage === "string" ? d.dosage : "",
    patientName: text(d.patientName),
  };
}

/** The button that was tapped, or null for a plain tap on the notification itself. */
export function doseActionFrom(actionIdentifier: string): DoseAction | null {
  return (Object.values(ACTION) as string[]).includes(actionIdentifier) ? (actionIdentifier as DoseAction) : null;
}

/** ids of every notification belonging to one dose: its reminder, its follow-ups and any snoozes. */
export function isDoseNotificationId(id: string, medicationId: string, scheduledAtMs: number): boolean {
  const base = `${medicationId}:${scheduledAtMs}`;
  return id === `dose:${base}` || id.startsWith(`nag:${base}:`) || id.startsWith(`snooze:${base}:`);
}

export const isSnoozeId = (id: string) => id.startsWith("snooze:");
