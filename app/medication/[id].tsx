import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { friendlyError } from "../../src/lib/friendlyError";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import { useAllMedications, useArchiveMedication, useDeleteMedication } from "../../src/features/medications/useMedications";
import { describeRecurrence, describeRecurrenceTimes } from "../../src/features/medications/describeRecurrence";
import { describeCourse } from "../../src/features/medications/describeCourse";
import { refillHeadline, refillStatus } from "../../src/features/medications/refill";
import { useI18n } from "../../src/i18n/LocaleProvider";

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
  const i18n = useI18n();
  const { t } = i18n;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useActiveProfile();
  const { data: medications, isLoading } = useAllMedications(profile?.id);
  const archiveMedication = useArchiveMedication(profile?.id);
  const deleteMedication = useDeleteMedication();

  const medication = medications?.find((m) => m.id === id);

  if (isLoading || !medication) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;
  }

  const times = describeRecurrenceTimes(medication.recurrenceRule, i18n);
  const course = describeCourse(medication, new Date(), i18n);
  const refill = refillStatus(medication);

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
        <InfoLine label={t("meds.detail.frequency")} value={describeRecurrence(medication.recurrenceRule, i18n)} />
        {times && <InfoLine label={t("meds.detail.reminderTimes")} value={times} />}
        <InfoLine label={t("meds.detail.treatment")} value={course.range ?? t("course.ongoingNoEnd")} />
        <InfoLine label={t("meds.detail.instructions")} value={medication.instructions || t("meds.detail.noneNoted")} />
        {medication.quantityOnHand != null && (
          <InfoLine
            label={t("meds.detail.supply")}
            value={refill?.low ? t("meds.detail.supplyLow", { count: medication.quantityOnHand, headline: refillHeadline(refill, i18n) }) : t("meds.detail.supplyLine", { count: medication.quantityOnHand })}
          />
        )}
      </View>

      {course.active && (
        <View style={styles.actions}>
          <AppButton label={t("meds.detail.edit")} variant="secondary" onPress={() => router.push(`/medication/edit/${medication.id}`)} />
        </View>
      )}

      {course.active && (
      <View style={styles.destructive}>
        <AppButton
          label={t("meds.detail.stop")}
          variant="destructive"
          onPress={() =>
            Alert.alert(t("meds.detail.stopTitle"), t("meds.detail.stopBody"), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("meds.detail.stopConfirm"),
                style: "destructive",
                onPress: async () => {
                  try {
                    await archiveMedication.mutateAsync(medication.id);
                    router.dismiss();
                  } catch (err) {
                    Alert.alert(t("meds.detail.errStop"), friendlyError(err));
                  }
                },
              },
            ])
          }
        />
      </View>
      )}

      <View style={styles.deleteRow}>
        <AppButton
          label={t("meds.detail.deleteLink")}
          variant="ghost"
          onPress={() =>
            Alert.alert(
              t("meds.detail.deleteTitle", { name: medication.name }),
              t("meds.detail.deleteBody"),
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("common.delete"),
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteMedication.mutateAsync(medication.id);
                      router.back();
                    } catch (err) {
                      Alert.alert(t("meds.detail.errDelete"), friendlyError(err));
                    }
                  },
                },
              ]
            )
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
  statusPill: { alignSelf: "flex-start", marginTop: 12, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  info: { marginTop: 36, gap: 22 },
  infoLine: { gap: 4 },
  infoLabel: { letterSpacing: 0.5 },
  infoValue: { lineHeight: 22 },
  actions: { marginTop: 32 },
  destructive: { marginTop: 12 },
  deleteRow: { marginTop: 8 },
});
