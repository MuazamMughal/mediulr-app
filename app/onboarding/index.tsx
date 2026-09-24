import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { AppLogo } from "../../src/components/AppLogo";

const THEMES = [
  { icon: "medkit-outline" as const, label: "Medications, on schedule" },
  { icon: "medical-outline" as const, label: "Doctor visits, remembered" },
  { icon: "calendar-outline" as const, label: "One calendar for it all" },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <Animated.View entering={FadeInDown.duration(500).springify().damping(16)}>
          <AppLogo size={64} style={styles.logo} />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(80).springify().damping(16)}>
          <AppText variant="display" style={styles.title}>
            Welcome to Mediulr
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            Mediulr helps you remember what matters.
          </AppText>
        </Animated.View>

        <View style={styles.themes}>
          {THEMES.map((t, i) => (
            <Animated.View
              key={t.label}
              entering={FadeInDown.duration(450).delay(180 + i * 90).springify().damping(16)}
              style={styles.themeRow}
            >
              <View style={[styles.themeIcon, { backgroundColor: theme.colors.surfaceSunken }]}>
                <Ionicons name={t.icon} size={18} color={theme.colors.accent} />
              </View>
              <AppText variant="bodyMedium">{t.label}</AppText>
            </Animated.View>
          ))}
        </View>
      </View>

      <Animated.View entering={FadeInUp.duration(450).delay(400)}>
        <AppButton label="Add your first medication" onPress={() => router.replace("/medication/new")} />
        <Pressable style={styles.skip} onPress={() => router.replace("/(tabs)")}>
          <AppText variant="bodySmall" color="tertiary">
            Skip for now
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", paddingHorizontal: 28 },
  top: { flex: 1 },
  logo: { marginBottom: 24 },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 40, lineHeight: 22 },
  themes: { gap: 20 },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  themeIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  skip: { alignItems: "center", paddingVertical: 16 },
});
