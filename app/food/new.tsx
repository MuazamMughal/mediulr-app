import { useLocalSearchParams } from "expo-router";
import { FoodForm } from "../../src/features/nutrition/FoodForm";
import { parseLocalDate } from "../../src/lib/dates";

export default function NewFoodScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <FoodForm mode="create" initialDay={date ? parseLocalDate(date) : undefined} />;
}
