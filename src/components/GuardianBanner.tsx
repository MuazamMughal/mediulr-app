import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import type { Guardian } from "../types/domain";

/** A single quiet row at the top of the medication list: who's told about missed doses, or an invitation to add someone. */
export function GuardianBanner({ guardians, onPress }: { guardians: Guardian[]; onPress: () => void }) {
  const theme = useTheme();
  const has = guardians.length > 0;
  const names = guardians.map((g) => g.name.split(" ")[0]).join(", ");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={has ? `Guardians: ${names}. Manage` : "Add a guardian"}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.accentSoft }]}>
        <Ionicons name="shield-checkmark" size={17} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyMedium" weight="semibold">
          {has ? `Guardian${guardians.length > 1 ? "s" : ""}: ${names}` : "Add a guardian"}
        </AppText>
        <AppText variant="caption" color="secondary" style={{ marginTop: 1 }}>
          {has ? "Tell them in one tap if you miss a dose" : "Someone to tell in one tap if you miss a dose"}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 20, marginBottom: 4, padding: 12, borderWidth: 1, borderRadius: 16, borderCurve: "continuous" },
  icon: { width: 36, height: 36, borderRadius: 12, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
});
