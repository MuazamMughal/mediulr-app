import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { AppLogo } from "../../src/components/AppLogo";
import { useI18n } from "../../src/i18n/LocaleProvider";

const THEMES = [
  { icon: "medkit-outline" as const, key: "onboarding.theme1" as const },
  { icon: "medical-outline" as const, key: "onboarding.theme2" as const },
  { icon: "calendar-outline" as const, key: "onboarding.theme3" as const },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const { t } = useI18n();
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
            {t("onboarding.welcome")}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            {t("onboarding.tagline")}
          </AppText>
        </Animated.View>

        <View style={styles.themes}>
          {THEMES.map((item, i) => (
            <Animated.View
              key={item.key}
              entering={FadeInDown.duration(450).delay(180 + i * 90).springify().damping(16)}
              style={styles.themeRow}
            >
              <View style={[styles.themeIcon, { backgroundColor: theme.colors.surfaceSunken }]}>
                <Ionicons name={item.icon} size={18} color={theme.colors.accent} />
              </View>
              <AppText variant="bodyMedium">{t(item.key)}</AppText>
            </Animated.View>
          ))}
        </View>
      </View>

      <Animated.View entering={FadeInUp.duration(450).delay(400)}>
        <AppButton label={t("onboarding.addFirst")} onPress={() => router.replace("/medication/new")} />
        <Pressable style={styles.skip} onPress={() => router.replace("/(tabs)")}>
          <AppText variant="bodySmall" color="tertiary">
            {t("onboarding.skip")}
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
