import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { useI18n } from "../../i18n/LocaleProvider";
import { AppText } from "../../components/AppText";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { SheetHeader } from "../../components/SheetHeader";
import { SegmentedChips } from "../../components/SegmentedChips";
import { DateTimeField } from "../../components/DateTimeField";
import { TimeSlotEditor } from "../../components/TimeSlotEditor";
import { WeekdayChips } from "../../components/WeekdayChips";
import { friendlyError } from "../../lib/friendlyError";
import { addDays, parseLocalDate, startOfLocalDay, toLocalDateString } from "../../lib/dates";
import type { RecurrenceRule, Weekday } from "../../lib/recurrence";
import { useActiveProfile } from "../profile/ActiveProfile";
import { requestNotificationPermission } from "../notifications/scheduleNotifications";
import { useAddReminder, useDeleteReminder, useUpdateReminder } from "./useReminders";
import type { CustomReminder } from "../../types/domain";
import type { ReminderInput } from "./api";

type Props = { mode: "create"; initialDay?: Date } | { mode: "edit"; reminder: CustomReminder };

type Repeat = "once" | "daily" | "weekly" | "monthly" | "everyN";
const REPEATS: Repeat[] = ["once", "daily", "weekly", "monthly", "everyN"];
const DAILY_DEFAULTS: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "21:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};
const JS_DAY_CODES: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MAX_EVERY = 365;

/** Rounds up to the next whole hour: a sensible default for "remind me at…". */
function nextHour(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function repeatOf(rule: RecurrenceRule): Repeat {
  switch (rule.type) {
    case "once":
      return "once";
    case "weekdays":
      return "weekly";
    case "monthly":
      return "monthly";
    case "every_n_days":
      return "everyN";
    default:
      return "daily";
  }
}

/** Adds, views, edits and deletes a custom reminder. Five ways to repeat; only the title is truly required. */
export function ReminderForm(props: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, fmt } = useI18n();
  const { profile } = useActiveProfile();
  const addReminder = useAddReminder(profile?.id);
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const existing = props.mode === "edit" ? props.reminder : null;
  const editing = !!existing;
  const rule0 = existing?.recurrenceRule;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [repeat, setRepeat] = useState<Repeat>(rule0 ? repeatOf(rule0) : "once");
  const [when, setWhen] = useState(() => {
    if (rule0?.type === "once") return new Date(rule0.at);
    const base = props.mode === "create" && props.initialDay ? props.initialDay : new Date();
    const next = nextHour();
    // Logging for another day: same clock time on that day.
    if (props.mode === "create" && props.initialDay && props.initialDay.toDateString() !== new Date().toDateString()) {
      const d = new Date(base);
      d.setHours(next.getHours(), 0, 0, 0);
      return d;
    }
    return next;
  });
  const [startDate, setStartDate] = useState(() => (existing ? parseLocalDate(existing.startDate) : startOfLocalDay(props.mode === "create" && props.initialDay ? props.initialDay : new Date())));
  const [times, setTimes] = useState<string[]>(() => {
    if (rule0 && rule0.type !== "once" && rule0.type !== "interval_hours") return [...rule0.at];
    return DAILY_DEFAULTS[1];
  });
  const [days, setDays] = useState<Weekday[]>(() => (rule0?.type === "weekdays" ? [...rule0.days] : [JS_DAY_CODES[new Date().getDay()]]));
  const [everyText, setEveryText] = useState(rule0?.type === "every_n_days" ? String(rule0.every) : "3");
  const [hasEnd, setHasEnd] = useState(!!existing?.endDate);
  const [endDate, setEndDate] = useState(() => (existing?.endDate ? parseLocalDate(existing.endDate) : addDays(startDate, 30)));

  const recurring = repeat !== "once";
  const multiTime = repeat === "daily";

  function chooseRepeat(next: Repeat) {
    setRepeat(next);
    // Only a daily reminder can have several times; the others keep the first.
    if (next !== "daily") setTimes((cur) => [cur[0] ?? DAILY_DEFAULTS[1][0]]);
  }

  // ── validation ────────────────────────────────────────────────────────────────────────────────
  const trimmedTitle = title.trim();
  const every = Number(everyText);
  const everyValid = Number.isInteger(every) && every >= 1 && every <= MAX_EVERY;
  const duplicateTimes = new Set(times).size !== times.length;
  const endBeforeStart = recurring && hasEnd && startOfLocalDay(endDate).getTime() < startOfLocalDay(startDate).getTime();
  const past = repeat === "once" && when.getTime() < Date.now();

  const built = useMemo<{ rule: RecurrenceRule; startDate: string; endDate: string | null } | null>(() => {
    const sorted = [...times].sort();
    switch (repeat) {
      case "once":
        return { rule: { type: "once", at: when.toISOString() }, startDate: toLocalDateString(when), endDate: null };
      case "daily":
        return { rule: { type: "times_per_day", count: sorted.length, at: sorted }, startDate: toLocalDateString(startDate), endDate: hasEnd ? toLocalDateString(endDate) : null };
      case "weekly":
        return days.length === 0 ? null : { rule: { type: "weekdays", days, at: sorted.slice(0, 1) }, startDate: toLocalDateString(startDate), endDate: hasEnd ? toLocalDateString(endDate) : null };
      case "monthly":
        return { rule: { type: "monthly", day: startDate.getDate(), at: sorted.slice(0, 1) }, startDate: toLocalDateString(startDate), endDate: hasEnd ? toLocalDateString(endDate) : null };
      case "everyN":
        return everyValid ? { rule: { type: "every_n_days", every, from: toLocalDateString(startDate), at: sorted.slice(0, 1) }, startDate: toLocalDateString(startDate), endDate: hasEnd ? toLocalDateString(endDate) : null } : null;
    }
  }, [repeat, times, when, startDate, endDate, hasEnd, days, every, everyValid]);

  const changed =
    !existing ||
    trimmedTitle !== existing.title ||
    (notes.trim() || null) !== existing.notes ||
    JSON.stringify(built?.rule) !== JSON.stringify(existing.recurrenceRule) ||
    built?.startDate !== existing.startDate ||
    (built?.endDate ?? null) !== existing.endDate;
  const canSave = trimmedTitle.length > 0 && !!built && !!profile && !duplicateTimes && !endBeforeStart && changed;

  async function handleSave() {
    if (!canSave || !built || !profile) return;
    const input: ReminderInput = { title: trimmedTitle, notes: notes.trim() || null, recurrenceRule: built.rule, startDate: built.startDate, endDate: built.endDate };
    try {
      if (existing) await updateReminder.mutateAsync({ id: existing.id, input });
      else {
        // Ask before saving: the reminder sync runs the instant the reminder lands, so permission must already be settled.
        await requestNotificationPermission();
        await addReminder.mutateAsync(input);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.dismiss();
    } catch (err) {
      Alert.alert(existing ? t("reminders.errUpdate") : t("reminders.errSave"), friendlyError(err));
    }
  }

  function handleDelete() {
    if (!existing) return;
    Alert.alert(t("reminders.deleteTitle"), t("reminders.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("reminders.delete"),
        style: "destructive",
        onPress: () =>
          deleteReminder.mutate(existing.id, {
            onSuccess: () => router.dismiss(),
            onError: (err) => Alert.alert(t("reminders.errDelete"), friendlyError(err)),
          }),
      },
    ]);
  }

  const repeatLabels: Record<Repeat, string> = {
    once: t("reminders.repeat.once"),
    daily: t("reminders.repeat.daily"),
    weekly: t("reminders.repeat.weekly"),
    monthly: t("reminders.repeat.monthly"),
    everyN: t("reminders.repeat.everyN"),
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SheetHeader title={editing ? t("reminders.edit") : t("reminders.new")} onClose={() => router.dismiss()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
        {!editing && profile && !profile.isSelf && (
          <AppText variant="bodySmall" color="secondary" style={styles.subheading}>
            {t("reminders.forProfile", { name: profile.displayName })}
          </AppText>
        )}

        <View style={styles.field}>
          <AppInput label={t("reminders.titleLabel")} placeholder={t("reminders.titlePlaceholder")} value={title} onChangeText={setTitle} autoFocus={!editing} maxLength={120} />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            {t("reminders.repeat")}
          </AppText>
          <SegmentedChips options={REPEATS.map((r) => repeatLabels[r])} selectedIndex={REPEATS.indexOf(repeat)} onSelect={(i) => chooseRepeat(REPEATS[i])} />
        </View>

        {repeat === "once" && (
          <View style={styles.field}>
            <DateTimeField label={t("reminders.when")} value={when} onChange={setWhen} />
            {past && (
              <AppText variant="caption" color="warning" style={styles.hint}>
                {t("reminders.pastHint")}
              </AppText>
            )}
          </View>
        )}

        {repeat === "weekly" && (
          <View style={styles.field}>
            <AppText variant="caption" color="secondary" style={styles.label}>
              {t("reminders.days")}
            </AppText>
            <WeekdayChips selected={days} onChange={setDays} />
            {days.length === 0 && (
              <AppText variant="caption" color="danger" style={styles.hint}>
                {t("reminders.daysHint")}
              </AppText>
            )}
          </View>
        )}

        {repeat === "everyN" && (
          <View style={styles.field}>
            <AppInput
              label={t("reminders.everyNLabel")}
              placeholder={t("reminders.everyNPlaceholder")}
              value={everyText}
              onChangeText={(x) => setEveryText(x.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              maxLength={3}
              error={everyText !== "" && !everyValid ? t("reminders.everyNError") : undefined}
            />
          </View>
        )}

        {multiTime && (
          <View style={styles.field}>
            <AppText variant="caption" color="secondary" style={styles.label}>
              {t("reminders.timesPerDay")}
            </AppText>
            <SegmentedChips
              options={["1×", "2×", "3×", "4×"]}
              selectedIndex={Math.min(times.length, 4) - 1}
              onSelect={(i) => setTimes(DAILY_DEFAULTS[i + 1])}
            />
          </View>
        )}

        {recurring && (
          <View style={styles.field}>
            <AppText variant="caption" color="secondary" style={styles.label}>
              {multiTime ? t("reminders.times") : t("reminders.time")}
            </AppText>
            <TimeSlotEditor times={times} onChange={setTimes} rowLabel={(i) => (multiTime ? t("reminders.timeSlot", { n: i + 1 }) : t("reminders.time"))} />
            {duplicateTimes && (
              <AppText variant="caption" color="danger" style={styles.hint}>
                {t("reminders.duplicateTimes")}
              </AppText>
            )}
          </View>
        )}

        {recurring && (
          <View style={styles.field}>
            <DateTimeField label={t("reminders.startsOn")} value={startDate} onChange={(d) => setStartDate(startOfLocalDay(d))} mode="date" />
            {repeat === "monthly" && (
              <AppText variant="caption" color="tertiary" style={styles.hint}>
                {t("reminders.monthlyHint", { day: startDate.getDate() })}
              </AppText>
            )}
          </View>
        )}

        {recurring && (
          <View style={styles.field}>
            <View style={styles.switchRow}>
              <AppText variant="bodyMedium" style={{ flex: 1 }}>
                {t("reminders.endToggle")}
              </AppText>
              <Switch value={hasEnd} onValueChange={setHasEnd} trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }} accessibilityLabel={t("reminders.endToggle")} />
            </View>
            {hasEnd && (
              <View style={{ marginTop: 12 }}>
                <DateTimeField label={t("reminders.endsOn")} value={endDate} onChange={(d) => setEndDate(startOfLocalDay(d))} mode="date" />
                {endBeforeStart && (
                  <AppText variant="caption" color="danger" style={styles.hint}>
                    {t("reminders.endError")}
                  </AppText>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.field}>
          <AppInput label={t("reminders.notesLabel")} placeholder={t("reminders.notesPlaceholder")} value={notes} onChangeText={setNotes} multiline maxLength={500} style={styles.multiline} />
        </View>

        {editing && (
          <View style={styles.destructive}>
            <AppButton label={t("reminders.delete")} variant="destructive" onPress={handleDelete} loading={deleteReminder.isPending} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <AppButton label={editing ? t("reminders.saveChanges") : t("reminders.save")} onPress={handleSave} disabled={!canSave} loading={addReminder.isPending || updateReminder.isPending} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  subheading: { marginBottom: 20 },
  field: { marginBottom: 20 },
  label: { marginBottom: 8, marginStart: 2 },
  hint: { marginTop: 8, marginStart: 2, lineHeight: 17 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  destructive: { marginTop: 10 },
  footer: { padding: 16, borderTopWidth: 1 },
});
