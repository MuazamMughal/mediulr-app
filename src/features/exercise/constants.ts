import type { Ionicons } from "@expo/vector-icons";
import type { ExerciseType, Intensity } from "../../types/domain";

type IconName = keyof typeof Ionicons.glyphMap;

export const EXERCISE_TYPES: { value: ExerciseType; label: string; icon: IconName }[] = [
  { value: "walking", label: "Walking", icon: "walk-outline" },
  { value: "running", label: "Running", icon: "footsteps-outline" },
  { value: "cycling", label: "Cycling", icon: "bicycle-outline" },
  { value: "gym", label: "Gym", icon: "fitness-outline" },
  { value: "strength", label: "Strength", icon: "barbell-outline" },
  { value: "yoga", label: "Yoga", icon: "body-outline" },
  { value: "stretching", label: "Stretching", icon: "accessibility-outline" },
  { value: "swimming", label: "Swimming", icon: "water-outline" },
  { value: "sports", label: "Sports", icon: "football-outline" },
  { value: "other", label: "Other", icon: "pulse-outline" },
];

export const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "vigorous", label: "Vigorous" },
];

export const DURATION_PRESETS = [15, 30, 45, 60, 90];

export function exerciseTypeLabel(type: ExerciseType): string {
  return EXERCISE_TYPES.find((t) => t.value === type)?.label ?? "Exercise";
}

export function exerciseIcon(type: ExerciseType): IconName {
  return EXERCISE_TYPES.find((t) => t.value === type)?.icon ?? "pulse-outline";
}

export function intensityLabel(value: Intensity): string {
  return INTENSITIES.find((i) => i.value === value)?.label ?? value;
}
