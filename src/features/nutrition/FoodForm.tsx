import { useMemo, useState } from "react";
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
import { MEAL_TYPES } from "./constants";
import { mealTypeForHour, recentFoods } from "./logic";
import { useAddFood, useDeleteFood, useRecentFood, useUpdateFood } from "./useFood";
import type { FoodEntry, MealType } from "../../types/domain";

type Props = { mode: "create"; initialDay?: Date } | { mode: "edit"; entry: FoodEntry };

/** Default moment for a new meal: right now, or — when logging on another day — midday of that day. */
function defaultWhen(day?: Date): Date {
  const now = new Date();
  if (!day || day.toDateString() === now.toDateString()) return now;
  const d = new Date(day);
  d.setHours(12, 0, 0, 0);
  return d;
}

/**
 * One form for adding, viewing and editing a meal. Only the name is required; meal type and time default
 * to something sensible (and the meal type follows the time until the person picks one themselves).
 */
export function FoodForm(props: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useActiveProfile();
  const editing = props.mode === "edit";
  const entry = props.mode === "edit" ? props.entry : null;

  const addFood = useAddFood(profile?.id);
  const updateFood = useUpdateFood();
  const deleteFood = useDeleteFood();
  const { data: recentEntries } = useRecentFood(editing ? undefined : profile?.id);
  // Very long names make unwieldy chips; they can still be re-typed, just not one-tapped.
  const recents = useMemo(() => recentFoods(recentEntries ?? []).filter((r) => r.name.length <= 28), [recentEntries]);

  const [name, setName] = useState(entry?.name ?? "");
  const [when, setWhen] = useState(() => (entry ? new Date(entry.eatenAt) : defaultWhen(props.mode === "create" ? props.initialDay : undefined)));
  const [mealType, setMealType] = useState<MealType>(entry?.mealType ?? mealTypeForHour(when.getHours()));
  const [mealPicked, setMealPicked] = useState(editing);
  const [quantity, setQuantity] = useState(entry?.quantity ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");

  const trimmedName = name.trim();
  const changed =
    !entry ||
    trimmedName !== entry.name ||
    mealType !== entry.mealType ||
    when.getTime() !== new Date(entry.eatenAt).getTime() ||
    (quantity.trim() || null) !== entry.quantity ||
    (notes.trim() || null) !== entry.notes;
  const canSave = trimmedName.length > 0 && !!profile && changed;
  const saving = addFood.isPending || updateFood.isPending;

  function changeWhen(next: Date) {
    setWhen(next);
    if (!mealPicked) setMealType(mealTypeForHour(next.getHours()));
  }

  async function handleSave() {
    if (!canSave) return;
    const input = {
      name: trimmedName,
      mealType,
      eatenAt: when.toISOString(),
      quantity: quantity.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (entry) await updateFood.mutateAsync({ id: entry.id, input });
      else await addFood.mutateAsync(input);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.dismiss();
    } catch (err) {
      Alert.alert(entry ? "Couldn't update meal" : "Couldn't save meal", friendlyError(err));
    }
  }

  function handleDelete() {
    if (!entry) return;
    Alert.alert("Delete this meal?", "It will be removed from your day and your calendar.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteFood.mutate(entry.id, {
            onSuccess: () => router.dismiss(),
            onError: (err) => Alert.alert("Couldn't delete meal", friendlyError(err)),
          }),
      },
    ]);
  }

  const recentSelected = recents.findIndex((r) => r.name.toLowerCase() === trimmedName.toLowerCase());

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SheetHeader title={editing ? "Edit meal" : "Add food"} onClose={() => router.dismiss()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
        {!editing && profile && !profile.isSelf && (
          <AppText variant="bodySmall" color="secondary" style={styles.subheading}>
            Adding for {profile.displayName}.
          </AppText>
        )}

        <View style={styles.field}>
          <AppInput
            label="What did you eat?"
            placeholder="e.g. Oatmeal and banana"
            value={name}
            onChangeText={setName}
            autoFocus={!editing}
            maxLength={120}
            returnKeyType="done"
          />
        </View>

        {!editing && recents.length > 0 && (
          <View style={styles.field}>
            <AppText variant="caption" color="secondary" style={styles.label}>
              Recent
            </AppText>
            <SegmentedChips
              options={recents.map((r) => r.name)}
              selectedIndex={recentSelected}
              onSelect={(i) => {
                setName(recents[i].name);
                if (recents[i].quantity && !quantity.trim()) setQuantity(recents[i].quantity as string);
              }}
            />
          </View>
        )}

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            Meal
          </AppText>
          <SegmentedChips
            options={MEAL_TYPES.map((m) => m.label)}
            selectedIndex={MEAL_TYPES.findIndex((m) => m.value === mealType)}
            onSelect={(i) => {
              setMealType(MEAL_TYPES[i].value);
              setMealPicked(true);
            }}
          />
        </View>

        <View style={styles.field}>
          <DateTimeField value={when} onChange={changeWhen} tint={theme.colors.nutrition} />
        </View>

        <View style={styles.field}>
          <AppInput label="How much? (optional)" placeholder="e.g. 1 bowl, 2 eggs, 200g" value={quantity} onChangeText={setQuantity} maxLength={60} />
        </View>

        <View style={styles.field}>
          <AppInput
            label="Notes (optional)"
            placeholder="e.g. Had this after my medication"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={1000}
            style={styles.multiline}
          />
        </View>

        {editing && (
          <View style={styles.destructive}>
            <AppButton label="Delete meal" variant="destructive" onPress={handleDelete} loading={deleteFood.isPending} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <AppButton label={editing ? "Save changes" : "Save meal"} onPress={handleSave} disabled={!canSave} loading={saving} />
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
