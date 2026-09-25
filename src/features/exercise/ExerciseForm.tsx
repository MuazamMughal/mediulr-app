import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { AppText } from "../../components/AppText";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { SheetHeader } from "../../components/SheetHeader";
import { SegmentedChips } from "../../components/SegmentedChips";
import { DateTimeField } from "../../components/DateTimeField";
import { friendlyError } from "../../lib/friendlyError";
import { useActiveProfile } from "../profile/ActiveProfile";
import { DURATION_PRESETS, EXERCISE_TYPES, INTENSITIES } from "./constants";
import { MAX_EXERCISE_MINUTES, formatDuration, parseCustomMinutes } from "./logic";
import { useAddExercise, useDeleteExercise, useUpdateExercise } from "./useExercise";
import type { ExerciseEntry, ExerciseType, Intensity } from "../../types/domain";

type Props = { mode: "create"; initialDay?: Date } | { mode: "edit"; entry: ExerciseEntry };

const CUSTOM = -1;

function defaultWhen(day?: Date): Date {
  const now = new Date();
  if (!day || day.toDateString() === now.toDateString()) return now;
  const d = new Date(day);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** One form for adding, viewing and editing an activity: pick a type, a duration, and you're done. */
export function ExerciseForm(props: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useActiveProfile();
  const editing = props.mode === "edit";
  const entry = props.mode === "edit" ? props.entry : null;

  const addExercise = useAddExercise(profile?.id);
  const updateExercise = useUpdateExercise();
  const deleteExercise = useDeleteExercise();

  const [type, setType] = useState<ExerciseType>(entry?.exerciseType ?? "walking");
  const [customName, setCustomName] = useState(entry?.name ?? "");
  const [when, setWhen] = useState(() => (entry ? new Date(entry.startedAt) : defaultWhen(props.mode === "create" ? props.initialDay : undefined)));
  const [duration, setDuration] = useState<number>(
    entry ? (DURATION_PRESETS.includes(entry.durationMinutes) ? entry.durationMinutes : CUSTOM) : 30
  );
  const [customMinutes, setCustomMinutes] = useState(entry && !DURATION_PRESETS.includes(entry.durationMinutes) ? String(entry.durationMinutes) : "");
  const [intensity, setIntensity] = useState<Intensity | null>(entry?.intensity ?? null);
  const [notes, setNotes] = useState(entry?.notes ?? "");

  const minutes = duration === CUSTOM ? parseCustomMinutes(customMinutes) : duration;
  const minutesValid = minutes !== null;
  const trimmedName = customName.trim();
  const needsName = type === "other";
  // Only "Other" carries a label; switching back to a named type drops it so it can't linger invisibly.
  const savedName = needsName ? trimmedName : null;

  const changed =
    !entry ||
    type !== entry.exerciseType ||
    savedName !== (entry.name?.trim() || null) ||
    when.getTime() !== new Date(entry.startedAt).getTime() ||
    minutes !== entry.durationMinutes ||
    intensity !== entry.intensity ||
    (notes.trim() || null) !== entry.notes;
  const canSave = !!profile && minutesValid && (!needsName || trimmedName.length > 0) && changed;
  const saving = addExercise.isPending || updateExercise.isPending;

  async function handleSave() {
    if (!canSave) return;
    const input = {
      exerciseType: type,
      name: savedName,
      startedAt: when.toISOString(),
      durationMinutes: minutes as number,
      intensity,
      notes: notes.trim() || null,
    };
    try {
      if (entry) await updateExercise.mutateAsync({ id: entry.id, input });
      else await addExercise.mutateAsync(input);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.dismiss();
    } catch (err) {
      Alert.alert(entry ? "Couldn't update activity" : "Couldn't save activity", friendlyError(err));
    }
  }

  function handleDelete() {
    if (!entry) return;
    Alert.alert("Delete this activity?", "It will be removed from your day and your calendar.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteExercise.mutate(entry.id, {
            onSuccess: () => router.dismiss(),
            onError: (err) => Alert.alert("Couldn't delete activity", friendlyError(err)),
          }),
      },
    ]);
  }

  const durationOptions = [...DURATION_PRESETS.map(formatDuration), "Custom"];
  const durationIndex = duration === CUSTOM ? DURATION_PRESETS.length : DURATION_PRESETS.indexOf(duration);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SheetHeader title={editing ? "Edit activity" : "Add exercise"} onClose={() => router.dismiss()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
        {!editing && profile && !profile.isSelf && (
          <AppText variant="bodySmall" color="secondary" style={styles.subheading}>
            Adding for {profile.displayName}.
          </AppText>
        )}

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            What did you do?
          </AppText>
          <SegmentedChips
            options={EXERCISE_TYPES.map((t) => t.label)}
            selectedIndex={EXERCISE_TYPES.findIndex((t) => t.value === type)}
            onSelect={(i) => setType(EXERCISE_TYPES[i].value)}
          />
        </View>

        {needsName && (
          <View style={styles.field}>
            <AppInput label="Activity name" placeholder="e.g. Badminton, Dance class" value={customName} onChangeText={setCustomName} maxLength={120} autoFocus={!editing} />
          </View>
        )}

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            How long?
          </AppText>
          <SegmentedChips
            options={durationOptions}
            selectedIndex={durationIndex}
            onSelect={(i) => setDuration(i === DURATION_PRESETS.length ? CUSTOM : DURATION_PRESETS[i])}
          />
          {duration === CUSTOM && (
            <View style={{ marginTop: 12 }}>
              <AppInput
                label="Minutes"
                placeholder="e.g. 50"
                value={customMinutes}
                onChangeText={(t) => setCustomMinutes(t.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                maxLength={4}
                error={customMinutes.length > 0 && !minutesValid ? `Enter 1 to ${MAX_EXERCISE_MINUTES} minutes` : undefined}
              />
            </View>
          )}
        </View>

        <View style={styles.field}>
          <DateTimeField label="Started" value={when} onChange={setWhen} tint={theme.colors.exercise} />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            How did it feel? (optional)
          </AppText>
          <SegmentedChips
            options={INTENSITIES.map((i) => i.label)}
            selectedIndex={INTENSITIES.findIndex((i) => i.value === intensity)}
            onSelect={(i) => setIntensity((cur) => (cur === INTENSITIES[i].value ? null : INTENSITIES[i].value))}
          />
        </View>

        <View style={styles.field}>
          <AppInput
            label="Notes (optional)"
            placeholder="e.g. Evening walk around the park"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={1000}
            style={styles.multiline}
          />
        </View>

        {editing && (
          <View style={styles.destructive}>
            <AppButton label="Delete activity" variant="destructive" onPress={handleDelete} loading={deleteExercise.isPending} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <AppButton label={editing ? "Save changes" : "Save activity"} onPress={handleSave} disabled={!canSave} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  subheading: { marginBottom: 20 },
  field: { marginBottom: 18 },
  label: { marginBottom: 8, marginLeft: 2 },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  destructive: { marginTop: 10 },
  footer: { padding: 16, borderTopWidth: 1 },
});
