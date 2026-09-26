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
import { useI18n } from "../../i18n/LocaleProvider";

const DEFAULT_TIMES: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "21:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

// Treatment length: `null` = ongoing (no end date), "custom" = the user types a number of days.
const DURATION_OPTIONS: { days: number | null | "custom" | "keep" }[] = [
  { days: null },
  { days: 3 },
  { days: 5 },
  { days: 7 },
  { days: 10 },
  { days: 14 },
  { days: 30 },
  { days: "custom" },
];
const MAX_COURSE_DAYS = 365;
const KEEP_OPTION = { days: "keep" as const };

type Props = { mode: "create" } | { mode: "edit"; medication: Medication };

function buildRule(frequencyIndex: number, times: string[]): RecurrenceRule {
  return { type: "times_per_day", count: frequencyIndex + 1, at: times };
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
  const i18n = useI18n();
  const { t, tn, fmt } = i18n;
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

  const durationLabel = (o: { days: number | null | "custom" | "keep" }) =>
    o.days === null ? t("meds.duration.ongoing") : o.days === "custom" ? t("meds.duration.custom") : o.days === "keep" ? t("meds.duration.keep") : t("meds.duration.days", { n: o.days });
  const duration = durationOptions[durationIndex];
  const isCustom = duration.days === "custom";
  const keepEnd = duration.days === "keep";

  // --- validation -----------------------------------------------------------------------------
  const customDaysNumber = Number(customDays);
  const customDaysError =
    isCustom && customDays !== "" && (!Number.isInteger(customDaysNumber) || customDaysNumber < 1 || customDaysNumber > MAX_COURSE_DAYS)
      ? t("meds.form.daysError", { max: MAX_COURSE_DAYS })
      : undefined;
  const quantityNumber = Number(quantityOnHand);
  const quantityError =
    quantityOnHand !== "" && (!Number.isInteger(quantityNumber) || quantityNumber < 0) ? t("meds.form.quantityError") : undefined;
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
          Alert.alert(t("meds.form.errSaveChanges"), friendlyError(err));
        }
      };
      if (scheduleChanged) {
        Alert.alert(t("meds.form.changeScheduleTitle"), t("meds.form.changeScheduleBody"), [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("meds.form.changeScheduleConfirm"), onPress: finish },
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
      Alert.alert(t("meds.form.errSave"), friendlyError(err));
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SheetHeader title={editing ? t("meds.form.editTitle") : t("meds.form.addTitle")} onClose={() => router.dismiss()} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="bodySmall" color="secondary" style={styles.subheading}>
          {editing
            ? t("meds.form.editHint")
            : `${profile && !profile.isSelf ? `${t("common.addingFor", { name: profile.displayName })} ` : ""}${t("meds.form.addHint")}`}
        </AppText>

        <View style={styles.field}>
          <AppInput label={t("meds.form.name")} placeholder={t("meds.form.namePlaceholder")} value={name} onChangeText={setName} autoFocus={!editing} />
        </View>

        <View style={styles.field}>
          <AppInput label={t("meds.form.dosage")} placeholder={t("meds.form.dosagePlaceholder")} value={dosage} onChangeText={setDosage} />
        </View>

        <View style={styles.field}>
          <AppInput
            label={t("meds.form.instructions")}
            placeholder={t("meds.form.instructionsPlaceholder")}
            value={instructions}
            onChangeText={setInstructions}
          />
        </View>

        {scheduleEditable && (
        <>
        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            {t("meds.form.howOften")}
          </AppText>
          <SegmentedChips options={[1, 2, 3, 4].map((n) => t(`meds.freq.${n}` as "meds.freq.1"))} selectedIndex={frequencyIndex} onSelect={handleFrequencyChange} />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            {t("meds.form.reminderTimes")}
          </AppText>
          <TimeSlotEditor times={times} onChange={setTimes} />
          {hasDuplicateTimes && (
            <AppText variant="caption" color="danger" style={styles.hint}>
              {t("meds.form.duplicateTimes")}
            </AppText>
          )}
        </View>

        </>
        )}

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            {t("meds.form.forHowLong")}
          </AppText>
          <SegmentedChips options={durationOptions.map(durationLabel)} selectedIndex={durationIndex} onSelect={setDurationIndex} />
          {isCustom && (
            <View style={styles.customDays}>
              <AppInput
                label={t("meds.form.numberOfDays")}
                placeholder={t("meds.form.numberOfDaysPlaceholder")}
                keyboardType="number-pad"
                value={customDays}
                onChangeText={(x) => setCustomDays(x.replace(/[^0-9]/g, ""))}
                error={customDaysError}
              />
            </View>
          )}
          <AppText variant="caption" color="tertiary" style={styles.hint}>
            {keepEnd
              ? medication
                ? t("meds.form.currently", { range: describeCourse(medication, new Date(), i18n).range ?? t("course.ongoingLower") })
                : ""
              : endDate
              ? tn("meds.form.throughDate", courseDays ?? 0, { date: fmt.monthDayShort(parseLocalDate(endDate)) })
              : isCustom
                ? t("meds.form.enterDays")
                : t("meds.form.noEnd")}
          </AppText>
        </View>

        <View style={styles.field}>
          <AppInput
            label={t("meds.form.quantity")}
            placeholder={editing ? t("meds.form.quantityPlaceholderEdit") : t("meds.form.quantityPlaceholderNew")}
            keyboardType="number-pad"
            value={quantityOnHand}
            onChangeText={(x) => setQuantityOnHand(x.replace(/[^0-9]/g, ""))}
            error={quantityError}
          />
          <AppText variant="caption" color="tertiary" style={styles.hint}>
            {t("meds.form.quantityHint")}
          </AppText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <AppButton
          label={editing ? t("meds.form.saveChanges") : t("meds.form.save")}
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
  label: { marginBottom: 8, marginStart: 2 },
  hint: { marginTop: 10, marginStart: 2, lineHeight: 17 },
  customDays: { marginTop: 14 },
  footer: { padding: 16, borderTopWidth: 1 },
});
