import type { Ionicons } from "@expo/vector-icons";
import { getI18n, type I18n } from "../../i18n";
import type { MealType } from "../../types/domain";

type IconName = keyof typeof Ionicons.glyphMap;

export const MEAL_TYPES: { value: MealType; icon: IconName }[] = [
  { value: "breakfast", icon: "sunny-outline" },
  { value: "lunch", icon: "restaurant-outline" },
  { value: "dinner", icon: "moon-outline" },
  { value: "snack", icon: "nutrition-outline" },
  { value: "other", icon: "ellipsis-horizontal" },
];

export function mealLabel(type: MealType, { t }: Pick<I18n, "t"> = getI18n()): string {
  return t(`meal.${type}` as "meal.breakfast");
}

export function mealIcon(type: MealType): IconName {
  return MEAL_TYPES.find((m) => m.value === type)?.icon ?? "restaurant-outline";
}
