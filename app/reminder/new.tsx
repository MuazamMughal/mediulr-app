import { useLocalSearchParams } from "expo-router";
import { ReminderForm } from "../../src/features/reminders/ReminderForm";
import { parseLocalDate } from "../../src/lib/dates";

export default function NewReminderScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <ReminderForm mode="create" initialDay={date ? parseLocalDate(date) : undefined} />;
}
