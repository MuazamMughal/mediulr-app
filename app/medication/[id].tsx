import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { friendlyError } from "../../src/lib/friendlyError";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useArchiveMedication, useMedications } from "../../src/features/medications/useMedications";
import { describeRecurrence, describeRecurrenceTimes } from "../../src/features/medications/describeRecurrence";

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <AppText variant="caption" color="tertiary" style={styles.infoLabel}>
        {label}
      </AppText>
      <AppText variant="bodyMedium" style={styles.infoValue}>
        {value}
      </AppText>
    </View>
  );
}

export default function MedicationDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useActiveSelfProfile();
  const { data: medications, isLoading } = useMedications(profile?.id);
  const archiveMedication = useArchiveMedication(profile?.id);

  const medication = medications?.find((m) => m.id === id);

  if (isLoading || !medication) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;
  }

  const times = describeRecurrenceTimes(medication.recurrenceRule);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: theme.colors.medicationSoft }]}>
        <Ionicons name="medkit" size={24} color={theme.colors.medication} />
      </View>
      <AppText variant="h1" style={styles.name}>
        {medication.name}
      </AppText>
      <AppText variant="body" color="secondary">
        {medication.dosage}
      </AppText>

      <View style={styles.info}>
        <InfoLine label="FREQUENCY" value={describeRecurrence(medication.recurrenceRule)} />
        {times && <InfoLine label="REMINDER TIMES" value={times} />}
        <InfoLine label="INSTRUCTIONS" value={medication.instructions || "None noted"} />
        {medication.quantityOnHand != null && (
          <InfoLine label="QUANTITY REMAINING" value={`${medication.quantityOnHand} doses`} />
        )}
      </View>

      <View style={styles.destructive}>
        <AppButton
          label="Stop this medication"
          variant="destructive"
          onPress={() =>
            Alert.alert("Stop this medication?", "This stops future reminders. It won't delete past history.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Stop",
                style: "destructive",
                onPress: async () => {
                  try {
                    await archiveMedication.mutateAsync(medication.id);
                    router.back();
                  } catch (err) {
                    Alert.alert("Couldn't stop medication", friendlyError(err));
                  }
                },
              },
            ])
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  hero: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  name: { marginBottom: 3 },
  info: { marginTop: 36, gap: 22 },
  infoLine: { gap: 4 },
  infoLabel: { letterSpacing: 0.5 },
  infoValue: { lineHeight: 22 },
  destructive: { marginTop: 44 },
});
