import type { Ionicons } from "@expo/vector-icons";
import { getI18n, type I18n } from "../../i18n";
import type { ExerciseType, Intensity } from "../../types/domain";

type IconName = keyof typeof Ionicons.glyphMap;

/** Values and icons only: the wording comes from the current language via exerciseTypeLabel(). */
export const EXERCISE_TYPES: { value: ExerciseType; icon: IconName }[] = [
  { value: "walking", icon: "walk-outline" },
  { value: "running", icon: "footsteps-outline" },
  { value: "cycling", icon: "bicycle-outline" },
  { value: "gym", icon: "fitness-outline" },
  { value: "strength", icon: "barbell-outline" },
  { value: "yoga", icon: "body-outline" },
  { value: "stretching", icon: "accessibility-outline" },
  { value: "swimming", icon: "water-outline" },
  { value: "sports", icon: "football-outline" },
  { value: "other", icon: "pulse-outline" },
];

export const INTENSITIES: { value: Intensity }[] = [{ value: "light" }, { value: "moderate" }, { value: "vigorous" }];

export const DURATION_PRESETS = [15, 30, 45, 60, 90];

export function exerciseTypeLabel(type: ExerciseType, { t }: Pick<I18n, "t"> = getI18n()): string {
  return t(`exercise.type.${type}` as "exercise.type.walking");
}

export function exerciseIcon(type: ExerciseType): IconName {
  return EXERCISE_TYPES.find((x) => x.value === type)?.icon ?? "pulse-outline";
}

export function intensityLabel(value: Intensity, { t }: Pick<I18n, "t"> = getI18n()): string {
  return t(`intensity.${value}` as "intensity.light");
}
