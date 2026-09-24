import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppCard } from "../../src/components/AppCard";
import { AppButton } from "../../src/components/AppButton";
import { Divider } from "../../src/components/Divider";
import { friendlyError } from "../../src/lib/friendlyError";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useArchiveMedication, useMedications } from "../../src/features/medications/useMedications";
import { describeRecurrence, describeRecurrenceTimes } from "../../src/features/medications/describeRecurrence";

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: theme.colors.medicationSoft }]}>
        <Ionicons name={icon} size={16} color={theme.colors.medication} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="metadata" color="tertiary">
          {label}
        </AppText>
        <AppText variant="bodyMedium">{value}</AppText>
      </View>
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: theme.colors.medicationSoft }]}>
        <Ionicons name="medkit" size={22} color={theme.colors.medication} />
      </View>
      <AppText variant="h1" style={styles.name}>
        {medication.name}
      </AppText>
      <AppText variant="body" color="secondary">
        {medication.dosage}
      </AppText>

      <AppCard style={styles.card}>
        <InfoRow icon="time-outline" label="Frequency" value={describeRecurrence(medication.recurrenceRule)} />
        {describeRecurrenceTimes(medication.recurrenceRule) && (
          <>
            <Divider style={styles.divider} />
            <InfoRow
              icon="alarm-outline"
              label="Reminder times"
              value={describeRecurrenceTimes(medication.recurrenceRule) as string}
            />
          </>
        )}
        <Divider style={styles.divider} />
        <InfoRow icon="document-text-outline" label="Instructions" value={medication.instructions || "None noted"} />
        {medication.quantityOnHand != null && (
          <>
            <Divider style={styles.divider} />
            <InfoRow icon="cube-outline" label="Quantity remaining" value={`${medication.quantityOnHand} doses`} />
          </>
        )}
      </AppCard>

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
  content: { padding: 20 },
  hero: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  name: { marginBottom: 2 },
  card: { marginTop: 24 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  infoIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  divider: { marginVertical: 12 },
  destructive: { marginTop: 32 },
});
