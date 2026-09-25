import { useLocalSearchParams } from "expo-router";
import { ExerciseForm } from "../../src/features/exercise/ExerciseForm";
import { parseLocalDate } from "../../src/lib/dates";

export default function NewExerciseScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <ExerciseForm mode="create" initialDay={date ? parseLocalDate(date) : undefined} />;
}
