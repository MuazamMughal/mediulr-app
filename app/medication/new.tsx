import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppInput } from "../../src/components/AppInput";
import { AppButton } from "../../src/components/AppButton";
import { SegmentedChips } from "../../src/components/SegmentedChips";
import { TimeSlotEditor } from "../../src/components/TimeSlotEditor";
import { SheetHeader } from "../../src/components/SheetHeader";
import { friendlyError } from "../../src/lib/friendlyError";
import { courseEndDate, parseLocalDate, toLocalDateString } from "../../src/lib/dates";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import { useAddMedication } from "../../src/features/medications/useMedications";
import type { RecurrenceRule } from "../../src/lib/recurrence";
import { requestNotificationPermission } from "../../src/features/notifications/scheduleNotifications";

const FREQUENCY_LABELS = ["Once a day", "Twice a day", "3× daily", "4× daily"];

const DEFAULT_TIMES: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "21:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

// Treatment length: `null` = ongoing (no end date), "custom" = the user types a number of days.
const DURATION_OPTIONS: { label: string; days: number | null | "custom" }[] = [
  { label: "Ongoing", days: null },
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "7 days", days: 7 },
  { label: "10 days", days: 10 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "Custom", days: "custom" },
];
const MAX_COURSE_DAYS = 365;

function buildRule(frequencyIndex: number, times: string[]): RecurrenceRule {
  return { type: "times_per_day", count: frequencyIndex + 1, at: times };
}

function formatDay(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NewMedicationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useActiveProfile();
  const addMedication = useAddMedication();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [frequencyIndex, setFrequencyIndex] = useState(2); // default: 3x/day
  const [times, setTimes] = useState<string[]>(DEFAULT_TIMES[3]);
  const [durationIndex, setDurationIndex] = useState(0); // default: ongoing
  const [customDays, setCustomDays] = useState("");
  const [quantityOnHand, setQuantityOnHand] = useState("");

  function handleFrequencyChange(index: number) {
    setFrequencyIndex(index);
    setTimes(DEFAULT_TIMES[index + 1]);
  }

  const duration = DURATION_OPTIONS[durationIndex];
  const isCustom = duration.days === "custom";

  // --- validation -----------------------------------------------------------------------------
  const customDaysNumber = Number(customDays);
  const customDaysError =
    isCustom && customDays !== "" && (!Number.isInteger(customDaysNumber) || customDaysNumber < 1 || customDaysNumber > MAX_COURSE_DAYS)
      ? `Enter a whole number of days from 1 to ${MAX_COURSE_DAYS}`
      : undefined;
  const quantityNumber = Number(quantityOnHand);
  const quantityError =
    quantityOnHand !== "" && (!Number.isInteger(quantityNumber) || quantityNumber < 0) ? "Enter a whole number, like 30" : undefined;
  const hasDuplicateTimes = new Set(times).size !== times.length;

  /** Course length in days, or null when ongoing / while a custom value is still incomplete. */
  const courseDays: number | null = isCustom
    ? customDays !== "" && !customDaysError
      ? customDaysNumber
      : null
    : (duration.days as number | null);

  const endDate = useMemo(() => (courseDays ? courseEndDate(new Date(), courseDays) : null), [courseDays]);

  const customIncomplete = isCustom && (customDays === "" || !!customDaysError);
  const canSave =
    name.trim().length > 0 &&
    dosage.trim().length > 0 &&
    !!profile &&
    !customIncomplete &&
    !quantityError &&
    !hasDuplicateTimes;

  async function handleSave() {
    if (!profile || !canSave) return;
    try {
      // Ask before saving: the reminder sync runs the instant the new medication lands, so permission must already be settled.
      await requestNotificationPermission();

      await addMedication.mutateAsync({
        profileId: profile.id,
        name: name.trim(),
        dosage: dosage.trim(),
        instructions: instructions.trim() || undefined,
        recurrenceRule: buildRule(frequencyIndex, [...times].sort()),
        quantityOnHand: quantityOnHand !== "" ? quantityNumber : undefined,
        startDate: toLocalDateString(new Date()),
        endDate: endDate ?? undefined,
      });

      router.dismiss();
    } catch (err) {
      Alert.alert("Couldn't save medication", friendlyError(err));
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SheetHeader title="Add medication" onClose={() => router.dismiss()} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="bodySmall" color="secondary" style={styles.subheading}>
          {profile && !profile.isSelf ? `Adding for ${profile.displayName}. ` : ""}We'll build the reminder schedule for you.
        </AppText>

        <View style={styles.field}>
          <AppInput label="Medication name" placeholder="e.g. Amoxicillin" value={name} onChangeText={setName} autoFocus />
        </View>

        <View style={styles.field}>
          <AppInput label="Dosage" placeholder="e.g. 500mg" value={dosage} onChangeText={setDosage} />
        </View>

        <View style={styles.field}>
          <AppInput
            label="Instructions (optional)"
            placeholder="e.g. with food"
            value={instructions}
            onChangeText={setInstructions}
          />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            How often
          </AppText>
          <SegmentedChips options={FREQUENCY_LABELS} selectedIndex={frequencyIndex} onSelect={handleFrequencyChange} />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            Reminder times
          </AppText>
          <TimeSlotEditor times={times} onChange={setTimes} />
          {hasDuplicateTimes && (
            <AppText variant="caption" color="danger" style={styles.hint}>
              Two doses are set to the same time — change one.
            </AppText>
          )}
        </View>

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            For how long
          </AppText>
          <SegmentedChips options={DURATION_OPTIONS.map((o) => o.label)} selectedIndex={durationIndex} onSelect={setDurationIndex} />
          {isCustom && (
            <View style={styles.customDays}>
              <AppInput
                label="Number of days"
                placeholder="e.g. 21"
                keyboardType="number-pad"
                value={customDays}
                onChangeText={(t) => setCustomDays(t.replace(/[^0-9]/g, ""))}
                error={customDaysError}
              />
            </View>
          )}
          <AppText variant="caption" color="tertiary" style={styles.hint}>
            {endDate
              ? `Today through ${formatDay(endDate)} (${courseDays} ${courseDays === 1 ? "day" : "days"}). After that it clears from your calendar and reminders stop.`
              : isCustom
                ? "Enter how many days you'll take it."
                : "No end date — reminders continue until you stop it."}
          </AppText>
        </View>

        <View style={styles.field}>
          <AppInput
            label="Quantity on hand (optional)"
            placeholder="For refill reminders — e.g. 30"
            keyboardType="number-pad"
            value={quantityOnHand}
            onChangeText={(t) => setQuantityOnHand(t.replace(/[^0-9]/g, ""))}
            error={quantityError}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <AppButton
          label="Save medication"
          onPress={handleSave}
          disabled={!canSave}
          loading={addMedication.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  subheading: { marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { marginBottom: 8, marginLeft: 2 },
  hint: { marginTop: 10, marginLeft: 2, lineHeight: 17 },
  customDays: { marginTop: 14 },
  footer: { padding: 16, borderTopWidth: 1 },
});
