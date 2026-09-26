import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { useI18n } from "../i18n/LocaleProvider";
import type { Guardian } from "../types/domain";
import { Chevron } from "./Chevron";

/** A single quiet row at the top of the medication list: who's told about missed doses, or an invitation to add someone. */
export function GuardianBanner({ guardians, onPress }: { guardians: Guardian[]; onPress: () => void }) {
  const theme = useTheme();
  const { t, tn, locale } = useI18n();
  const has = guardians.length > 0;
  const names = guardians.map((g) => g.name.split(" ")[0]).join(locale === "ur" ? "، " : ", ");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={has ? t("guardianBanner.namesA11y", { names }) : t("guardianBanner.add")}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.accentSoft }]}>
        <Ionicons name="shield-checkmark" size={17} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyMedium" weight="semibold">
          {has ? tn("guardianBanner.title", guardians.length, { names }) : t("guardianBanner.add")}
        </AppText>
        <AppText variant="caption" color="secondary" style={{ marginTop: 1 }}>
          {has ? t("guardianBanner.hasText") : t("guardianBanner.emptyText")}
        </AppText>
      </View>
      <Chevron color={theme.colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 20, marginBottom: 4, padding: 12, borderWidth: 1, borderRadius: 16, borderCurve: "continuous" },
  icon: { width: 36, height: 36, borderRadius: 12, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
});
