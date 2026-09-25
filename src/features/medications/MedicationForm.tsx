import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { AppText } from "../../components/AppText";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { SegmentedChips } from "../../components/SegmentedChips";
import { TimeSlotEditor } from "../../components/TimeSlotEditor";
import { SheetHeader } from "../../components/SheetHeader";
import { friendlyError } from "../../lib/friendlyError";
import { courseEndDate, parseLocalDate, toLocalDateString } from "../../lib/dates";
import { useActiveProfile } from "../profile/ActiveProfile";
import { useAddMedication, useReplaceMedicationSchedule, useUpdateMedication } from "./useMedications";
import type { RecurrenceRule } from "../../lib/recurrence";
import type { Medication } from "../../types/domain";
import { requestNotificationPermission } from "../notifications/scheduleNotifications";
import { defaultRefillThreshold } from "./refill";
import { describeCourse } from "./describeCourse";

const FREQUENCY_LABELS = ["Once a day", "Twice a day", "3× daily", "4× daily"];

const DEFAULT_TIMES: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "21:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

// Treatment length: `null` = ongoing (no end date), "custom" = the user types a number of days.
const DURATION_OPTIONS: { label: string; days: number | null | "custom" | "keep" }[] = [
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
const KEEP_OPTION = { label: "Keep current", days: "keep" as const };

type Props = { mode: "create" } | { mode: "edit"; medication: Medication };

function buildRule(frequencyIndex: number, times: string[]): RecurrenceRule {
  return { type: "times_per_day", count: frequencyIndex + 1, at: times };
}

function formatDay(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Adds a medication, or edits one. Editing name, dosage, notes, supply or the end date changes the medication in place.
 * Editing the *times* would silently rewrite every past day, so it stops the old medication and starts a new one from
 * now — history stays exactly as it was (the person is told this before it happens).
 */
export function MedicationForm(props: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useActiveProfile();
  const addMedication = useAddMedication();
  const updateMedication = useUpdateMedication();
  const replaceSchedule = useReplaceMedicationSchedule();
  const medication = props.mode === "edit" ? props.medication : null;
  const editing = !!medication;
  // Only the app's own "N times a day" schedules can be edited by time; anything else keeps its schedule.
  const rule0 = medication?.recurrenceRule;
  const scheduleEditable = !medication || (rule0?.type === "times_per_day" && rule0.at.length >= 1 && rule0.at.length <= 4);
  const durationOptions = editing ? [KEEP_OPTION, ...DURATION_OPTIONS] : DURATION_OPTIONS;

  const [name, setName] = useState(medication?.name ?? "");
  const [dosage, setDosage] = useState(medication?.dosage ?? "");
  const [instructions, setInstructions] = useState(medication?.instructions ?? "");
  const [frequencyIndex, setFrequencyIndex] = useState(rule0?.type === "times_per_day" ? Math.min(rule0.at.length, 4) - 1 : 2); // default: 3x/day
  const [times, setTimes] = useState<string[]>(rule0?.type === "times_per_day" ? [...rule0.at] : DEFAULT_TIMES[3]);
  const [durationIndex, setDurationIndex] = useState(0); // create: ongoing · edit: keep current
  const [customDays, setCustomDays] = useState("");
  const [quantityOnHand, setQuantityOnHand] = useState(medication?.quantityOnHand != null ? String(medication.quantityOnHand) : "");

  function handleFrequencyChange(index: number) {
    setFrequencyIndex(index);
    setTimes(DEFAULT_TIMES[index + 1]);
  }

  const duration = durationOptions[durationIndex];
  const isCustom = duration.days === "custom";
  const keepEnd = duration.days === "keep";

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
  const courseDays: number | null = keepEnd
    ? null
    : isCustom
      ? customDays !== "" && !customDaysError
        ? customDaysNumber
        : null
      : (duration.days as number | null);

  const endDate = useMemo(
    () => (keepEnd ? (medication?.endDate ?? null) : courseDays ? courseEndDate(new Date(), courseDays) : null),
    [keepEnd, courseDays, medication]
  );

  const rule = buildRule(frequencyIndex, [...times].sort());
  const quantityValue = quantityOnHand !== "" && !quantityError ? quantityNumber : null;
  const scheduleChanged = !!medication && scheduleEditable && JSON.stringify(rule) !== JSON.stringify(medication.recurrenceRule);
  const changed =
    !medication ||
    name.trim() !== medication.name ||
    dosage.trim() !== medication.dosage ||
    (instructions.trim() || null) !== medication.instructions ||
    quantityValue !== medication.quantityOnHand ||
    endDate !== medication.endDate ||
    scheduleChanged;

  const customIncomplete = isCustom && (customDays === "" || !!customDaysError);
  const canSave =
    name.trim().length > 0 &&
    dosage.trim().length > 0 &&
    !!profile &&
    !customIncomplete &&
    !quantityError &&
    !hasDuplicateTimes &&
    changed;

  async function handleSave() {
    if (!profile || !canSave) return;
    // A schedule this form can't edit keeps its own rule; its supply warning is based on that, not on the placeholder above.
    const refillThreshold = quantityValue != null ? defaultRefillThreshold(scheduleEditable ? rule : (medication as Medication).recurrenceRule) : null;

    if (medication) {
      const finish = async () => {
        try {
          if (scheduleChanged) {
            await replaceSchedule.mutateAsync({
              oldId: medication.id,
              next: {
                profileId: medication.profileId,
                name: name.trim(),
                dosage: dosage.trim(),
                instructions: instructions.trim() || undefined,
                recurrenceRule: rule,
                quantityOnHand: quantityValue ?? undefined,
                refillThreshold: refillThreshold ?? undefined,
                startDate: toLocalDateString(new Date()),
                endDate: endDate ?? undefined,
              },
            });
          } else {
            await updateMedication.mutateAsync({
              id: medication.id,
              edit: {
                name: name.trim(),
                dosage: dosage.trim(),
                instructions: instructions.trim() || null,
                quantityOnHand: quantityValue,
                refillThreshold,
                endDate,
              },
            });
          }
          router.dismiss();
        } catch (err) {
          Alert.alert("Couldn't save changes", friendlyError(err));
        }
      };
      if (scheduleChanged) {
        Alert.alert("Change the schedule?", "The new times start now. Everything already logged stays exactly as it was.", [
          { text: "Cancel", style: "cancel" },
          { text: "Change schedule", onPress: finish },
        ]);
      } else {
        await finish();
      }
      return;
    }

    try {
      // Ask before saving: the reminder sync runs the instant the new medication lands, so permission must already be settled.
      await requestNotificationPermission();

      await addMedication.mutateAsync({
        profileId: profile.id,
        name: name.trim(),
        dosage: dosage.trim(),
        instructions: instructions.trim() || undefined,
        recurrenceRule: rule,
        quantityOnHand: quantityValue ?? undefined,
        refillThreshold: refillThreshold ?? undefined,
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
      <SheetHeader title={editing ? "Edit medication" : "Add medication"} onClose={() => router.dismiss()} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="bodySmall" color="secondary" style={styles.subheading}>
          {editing
            ? "Changing the times keeps your history and applies from now."
            : `${profile && !profile.isSelf ? `Adding for ${profile.displayName}. ` : ""}We'll build the reminder schedule for you.`}
        </AppText>

        <View style={styles.field}>
          <AppInput label="Medication name" placeholder="e.g. Amoxicillin" value={name} onChangeText={setName} autoFocus={!editing} />
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

        {scheduleEditable && (
        <>
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

        </>
        )}

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            For how long
          </AppText>
          <SegmentedChips options={durationOptions.map((o) => o.label)} selectedIndex={durationIndex} onSelect={setDurationIndex} />
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
            {keepEnd
              ? medication
                ? `Currently: ${describeCourse(medication).range ?? "ongoing — no end date"}.`
                : ""
              : endDate
              ? `Today through ${formatDay(endDate)} (${courseDays} ${courseDays === 1 ? "day" : "days"}). After that it clears from your calendar and reminders stop.`
              : isCustom
                ? "Enter how many days you'll take it."
                : "No end date — reminders continue until you stop it."}
          </AppText>
        </View>

        <View style={styles.field}>
          <AppInput
            label="Quantity on hand (optional)"
            placeholder={editing ? "How many you have now — e.g. after a refill" : "For refill reminders — e.g. 30"}
            keyboardType="number-pad"
            value={quantityOnHand}
            onChangeText={(t) => setQuantityOnHand(t.replace(/[^0-9]/g, ""))}
            error={quantityError}
          />
          <AppText variant="caption" color="tertiary" style={styles.hint}>
            Mediulr counts it down as you take doses and reminds you to refill about three days before it runs out.
          </AppText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <AppButton
          label={editing ? "Save changes" : "Save medication"}
          onPress={handleSave}
          disabled={!canSave}
          loading={addMedication.isPending || updateMedication.isPending || replaceSchedule.isPending}
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
