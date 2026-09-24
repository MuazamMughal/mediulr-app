import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.accentSoft },
      ]}
    >
      <AppText variant="bodyMedium" color="accent" weight="bold" style={{ fontSize: size * 0.38 }}>
        {initialsOf(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
});
