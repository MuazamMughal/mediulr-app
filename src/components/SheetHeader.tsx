import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { useI18n } from "../i18n/LocaleProvider";

/**
 * A sheet's title row — title + close button. The drag handle itself comes from the
 * OS (`sheetGrabberVisible` on the Stack.Screen, a real formSheet grabber, not a drawn one).
 */
export function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <View style={styles.row}>
      <AppText variant="h2" style={{ flex: 1, marginEnd: 12 }}>{title}</AppText>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
        style={[styles.close, { backgroundColor: theme.colors.surfaceSunken }]}
      >
        <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 20, paddingHorizontal: 20 },
  close: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
