import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { describeRecurrence } from "../features/medications/describeRecurrence";
import { describeCourse } from "../features/medications/describeCourse";
import { refillStatus } from "../features/medications/refill";
import type { Medication } from "../types/domain";

export function MedicationRow({ medication, onPress }: { medication: Medication; onPress: () => void }) {
  const theme = useTheme();
  const supply = refillStatus(medication);
  const lowStock = !!supply?.low;

  const course = describeCourse(medication);
  const showCourse = course.status !== "Ongoing";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.colors.border }, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.medicationSoft }]}>
        <Ionicons name="medkit" size={18} color={theme.colors.medication} />
      </View>
      <View style={styles.body}>
        <AppText variant="bodyMedium" weight="semibold">
          {medication.name}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.subtitle}>
          {medication.dosage} · {describeRecurrence(medication.recurrenceRule)}
        </AppText>
        {showCourse && (
          <AppText variant="caption" color={course.active ? "accent" : "tertiary"} weight="semibold" style={styles.subtitle}>
            {course.status}
            {course.range ? ` · ${course.range}` : ""}
          </AppText>
        )}
      </View>
      {medication.quantityOnHand != null && (
        <View style={styles.meta}>
          <AppText variant="caption" color={lowStock ? "warning" : "tertiary"} weight={lowStock ? "semibold" : "regular"}>
            {lowStock ? "Refill soon · " : ""}
            {medication.quantityOnHand} left
          </AppText>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1 },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: 12, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  body: { flex: 1 },
  subtitle: { marginTop: 2 },
  meta: { marginRight: 4 },
});
