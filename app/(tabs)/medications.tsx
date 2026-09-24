import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { EmptyState } from "../../src/components/EmptyState";
import { SkeletonRow } from "../../src/components/Skeleton";
import { MedicationRow } from "../../src/components/MedicationRow";
import { useActiveSelfProfile } from "../../src/features/profile/useProfiles";
import { useMedications } from "../../src/features/medications/useMedications";

export default function MedicationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useActiveSelfProfile();
  const { data: medications, isLoading } = useMedications(profile?.id);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <AppText variant="h1">Medications</AppText>
      </View>

      {isLoading && (
        <View>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      )}

      {!isLoading && (!medications || medications.length === 0) && (
        <EmptyState
          icon="medkit-outline"
          title="No medications yet"
          description="Add your first medication and Mediulr will build a reminder schedule so you never lose track."
          actionLabel="Add medication"
          onAction={() => router.push("/medication/new")}
        />
      )}

      {!isLoading && medications && medications.length > 0 && (
        <FlatList
          data={medications}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MedicationRow medication={item} onPress={() => router.push(`/medication/${item.id}`)} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <AppButton label="+ Add medication" onPress={() => router.push("/medication/new")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  listContent: { paddingBottom: 8 },
  footer: { padding: 16, borderTopWidth: 1 },
});
