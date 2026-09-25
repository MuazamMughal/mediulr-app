import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { friendlyError } from "../../src/lib/friendlyError";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import { useAllMedications, useArchiveMedication } from "../../src/features/medications/useMedications";
import { describeRecurrence, describeRecurrenceTimes } from "../../src/features/medications/describeRecurrence";
import { describeCourse } from "../../src/features/medications/describeCourse";

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
  const { profile } = useActiveProfile();
  const { data: medications, isLoading } = useAllMedications(profile?.id);
  const archiveMedication = useArchiveMedication(profile?.id);

  const medication = medications?.find((m) => m.id === id);

  if (isLoading || !medication) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;
  }

  const times = describeRecurrenceTimes(medication.recurrenceRule);
  const course = describeCourse(medication);

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
      <View style={[styles.statusPill, { backgroundColor: course.active ? theme.colors.accentSoft : theme.colors.surfaceSunken }]}>
        <AppText variant="metadata" color={course.active ? "accent" : "secondary"} weight="semibold">
          {course.status}
        </AppText>
      </View>

      <View style={styles.info}>
        <InfoLine label="FREQUENCY" value={describeRecurrence(medication.recurrenceRule)} />
        {times && <InfoLine label="REMINDER TIMES" value={times} />}
        <InfoLine label="TREATMENT" value={course.range ?? "Ongoing — no end date"} />
        <InfoLine label="INSTRUCTIONS" value={medication.instructions || "None noted"} />
        {medication.quantityOnHand != null && (
          <InfoLine label="QUANTITY REMAINING" value={`${medication.quantityOnHand} doses`} />
        )}
      </View>

      {course.active && (
      <View style={styles.destructive}>
        <AppButton
          label="Stop this medication"
          variant="destructive"
          onPress={() =>
            Alert.alert("Stop this medication?", "This stops future reminders. Past days stay in your calendar.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Stop",
                style: "destructive",
                onPress: async () => {
                  try {
                    await archiveMedication.mutateAsync(medication.id);
                    router.dismiss();
                  } catch (err) {
                    Alert.alert("Couldn't stop medication", friendlyError(err));
                  }
                },
              },
            ])
          }
        />
      </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  hero: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  name: { marginBottom: 3 },
  statusPill: { alignSelf: "flex-start", marginTop: 12, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  info: { marginTop: 36, gap: 22 },
  infoLine: { gap: 4 },
  infoLabel: { letterSpacing: 0.5 },
  infoValue: { lineHeight: 22 },
  destructive: { marginTop: 44 },
});
