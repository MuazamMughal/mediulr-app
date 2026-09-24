import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

/**
 * A sheet's title row — title + close button. The drag handle itself comes from the
 * OS (`sheetGrabberVisible` on the Stack.Screen, a real formSheet grabber, not a drawn one).
 */
export function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <AppText variant="h2">{title}</AppText>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={[styles.close, { backgroundColor: theme.colors.surfaceSunken }]}
      >
        <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 20, paddingHorizontal: 20 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
