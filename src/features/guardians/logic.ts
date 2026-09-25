import type { Guardian } from "../../types/domain";

export const MAX_GUARDIANS = 3;

export const RELATIONSHIPS = ["Parent", "Partner", "Child", "Sibling", "Friend", "Caregiver"] as const;

/** "(555) 123-4567" → "5551234567"; keeps a single leading "+". Anything else non-numeric is dropped. */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

/** 7–15 digits with an optional leading + (the E.164 range), matching the database check. */
export function isValidPhone(input: string): boolean {
  return /^\+?[0-9]{7,15}$/.test(normalizePhone(input));
}

/** Guardians who should hear about missed doses. */
export function alertGuardians(guardians: Guardian[] | undefined): Guardian[] {
  return (guardians ?? []).filter((g) => g.notifyOnMissed);
}

/** Button wording: "Tell Mom" for one guardian, "Tell guardians" for several. */
export function tellLabel(guardians: Guardian[]): string {
  return guardians.length === 1 ? `Tell ${guardians[0].name.split(" ")[0]}` : "Tell guardians";
}

export interface MissedDoseMessageInput {
  /** The patient's name when the app user is a caregiver writing about someone else; null for "I". */
  patientName: string | null;
  medicationName: string;
  dosage: string;
  scheduledAt: Date;
}

/** The prefilled text. Deliberately minimal: what was missed and when — no diagnosis, no history. */
export function buildMissedDoseMessage({ patientName, medicationName, dosage, scheduledAt }: MissedDoseMessageInput): string {
  const time = scheduledAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const who = patientName ? `${patientName} missed` : "I missed";
  return `${who} the ${time} dose of ${medicationName} (${dosage}). Sent from Mediulr.`;
}

/**
 * `sms:` link for one or several recipients. iOS wants "&body=", Android "?body=" (a known platform difference),
 * and both take comma-separated recipients.
 */
export function smsUrl(phones: string[], body: string, platform: "ios" | "android"): string {
  const sep = platform === "ios" ? "&" : "?";
  return `sms:${phones.join(",")}${sep}body=${encodeURIComponent(body)}`;
}
