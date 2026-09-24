import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppInput } from "../../src/components/AppInput";
import { AppButton } from "../../src/components/AppButton";
import { SegmentedChips } from "../../src/components/SegmentedChips";
import { friendlyError } from "../../src/lib/friendlyError";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useAddMedication } from "../../src/features/medications/useMedications";
import { occurrencesInRange, type RecurrenceRule } from "../../src/lib/recurrence";
import { requestNotificationPermission, scheduleReminder } from "../../src/features/notifications/scheduleNotifications";

const FREQUENCY_LABELS = ["Once a day", "Twice a day", "3× daily", "4× daily"];

const DEFAULT_TIMES: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "21:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

function buildRule(frequencyIndex: number): RecurrenceRule {
  const count = frequencyIndex + 1;
  return { type: "times_per_day", count, at: DEFAULT_TIMES[count] };
}

export default function NewMedicationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useActiveSelfProfile();
  const addMedication = useAddMedication();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [frequencyIndex, setFrequencyIndex] = useState(2); // default: 3x/day
  const [quantityOnHand, setQuantityOnHand] = useState("");

  const canSave = name.trim().length > 0 && dosage.trim().length > 0 && !!profile;

  async function handleSave() {
    if (!profile) return;
    try {
      const recurrenceRule = buildRule(frequencyIndex);
      const startDate = new Date().toISOString().slice(0, 10);

      const medication = await addMedication.mutateAsync({
        profileId: profile.id,
        name: name.trim(),
        dosage: dosage.trim(),
        instructions: instructions.trim() || undefined,
        recurrenceRule,
        quantityOnHand: quantityOnHand ? Number(quantityOnHand) : undefined,
        startDate,
      });

      const granted = await requestNotificationPermission();
      if (granted) {
        const now = new Date();
        const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const occurrences = occurrencesInRange(recurrenceRule, now, weekOut, { startDate: now });
        for (const at of occurrences) {
          await scheduleReminder({
            id: `${medication.id}:${at.toISOString()}`,
            title: `Time for ${medication.name}`,
            body: medication.dosage,
            fireAt: at,
          });
        }
      }

      router.back();
    } catch (err) {
      Alert.alert("Couldn't save medication", friendlyError(err));
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="h1" style={styles.heading}>
          Add medication
        </AppText>
        <AppText variant="bodySmall" color="secondary" style={styles.subheading}>
          We'll build the reminder schedule for you.
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
          <SegmentedChips options={FREQUENCY_LABELS} selectedIndex={frequencyIndex} onSelect={setFrequencyIndex} />
        </View>

        <View style={styles.field}>
          <AppInput
            label="Quantity on hand (optional)"
            placeholder="For refill reminders — e.g. 30"
            keyboardType="numeric"
            value={quantityOnHand}
            onChangeText={setQuantityOnHand}
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
  heading: { marginBottom: 4 },
  subheading: { marginBottom: 24 },
  field: { marginBottom: 18 },
  label: { marginBottom: 8, marginLeft: 2 },
  footer: { padding: 16, borderTopWidth: 1 },
});
