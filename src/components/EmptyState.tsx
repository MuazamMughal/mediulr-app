import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { AppButton } from "./AppButton";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <View style={styles.iconStack}>
        <View style={[styles.ringOuter, { backgroundColor: theme.colors.surfaceSunken }]} />
        <View style={[styles.ringInner, { backgroundColor: theme.colors.accentSoft }]} />
        <Ionicons name={icon} size={26} color={theme.colors.accent} style={styles.icon} />
      </View>
      <AppText variant="h3" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="bodySmall" color="secondary" style={styles.description}>
        {description}
      </AppText>
      {actionLabel && onAction && (
        <View style={styles.action}>
          <AppButton label={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 56 },
  iconStack: { width: 88, height: 72, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  ringOuter: { position: "absolute", width: 88, height: 88, borderRadius: 44, top: -8, opacity: 0.5 },
  ringInner: { position: "absolute", width: 60, height: 60, borderRadius: 30 },
  icon: { position: "absolute" },
  title: { textAlign: "center", marginBottom: 6 },
  description: { textAlign: "center", lineHeight: 20, maxWidth: 260 },
  action: { marginTop: 22 },
});
