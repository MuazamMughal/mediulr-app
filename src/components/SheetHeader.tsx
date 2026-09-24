import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

/** A custom bottom-sheet header — drag handle, title, and a close button — used in place of the native nav bar on modal screens. */
export function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
      <View style={styles.row}>
        <AppText variant="h2">{title}</AppText>
        <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: theme.colors.surfaceSunken }]}>
          <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 10, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
