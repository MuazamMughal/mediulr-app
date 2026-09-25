import type { Ionicons } from "@expo/vector-icons";
import type { MealType } from "../../types/domain";

type IconName = keyof typeof Ionicons.glyphMap;

export const MEAL_TYPES: { value: MealType; label: string; icon: IconName }[] = [
  { value: "breakfast", label: "Breakfast", icon: "sunny-outline" },
  { value: "lunch", label: "Lunch", icon: "restaurant-outline" },
  { value: "dinner", label: "Dinner", icon: "moon-outline" },
  { value: "snack", label: "Snack", icon: "nutrition-outline" },
  { value: "other", label: "Other", icon: "ellipsis-horizontal" },
];

export function mealLabel(type: MealType): string {
  return MEAL_TYPES.find((m) => m.value === type)?.label ?? "Meal";
}

export function mealIcon(type: MealType): IconName {
  return MEAL_TYPES.find((m) => m.value === type)?.icon ?? "restaurant-outline";
}
