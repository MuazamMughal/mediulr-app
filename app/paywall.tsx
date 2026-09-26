import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/ThemeProvider";
import { AppText } from "../src/components/AppText";
import { AppButton } from "../src/components/AppButton";
import { useI18n } from "../src/i18n/LocaleProvider";

const FEATURES = [
  { icon: "people-outline" as const, key: "paywall.feature1" as const },
  { icon: "document-text-outline" as const, key: "paywall.feature2" as const },
  { icon: "notifications-outline" as const, key: "paywall.feature3" as const },
];

/**
 * Subscription screen stub. Real purchase flow wires up here via RevenueCat
 * (react-native-purchases) once App Store Connect / Play Console products exist
 * — see docs/SETUP.md §7.
 */
export default function PaywallScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.badge, { backgroundColor: theme.colors.accentSoft }]}>
          <Ionicons name="sparkles" size={22} color={theme.colors.accent} />
        </View>

        <AppText variant="h1" style={styles.title}>
          {t("paywall.title")}
        </AppText>
        <AppText variant="body" color="secondary" style={styles.subtitle}>
          {t("paywall.subtitle")}
        </AppText>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.key} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: theme.colors.surfaceSunken }]}>
                <Ionicons name={f.icon} size={16} color={theme.colors.accent} />
              </View>
              <AppText variant="body" style={{ flex: 1 }}>
                {t(f.key)}
              </AppText>
            </View>
          ))}
        </View>

        <View style={[styles.priceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <AppText variant="display">$2.99</AppText>
          <AppText variant="bodySmall" color="secondary">
            {t("paywall.price")}
          </AppText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <AppButton
          label={t("paywall.start")}
          onPress={() => {
            // TODO: wire up react-native-purchases purchase flow.
            router.dismiss();
          }}
        />
        <Pressable style={styles.secondaryLink} onPress={() => router.dismiss()}>
          <AppText variant="bodySmall" color="tertiary">
            {t("paywall.notNow")}
          </AppText>
        </Pressable>
        <Pressable style={styles.secondaryLink}>
          <AppText variant="caption" color="tertiary">
            {t("paywall.restore")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 28, alignItems: "center", flexGrow: 1, justifyContent: "center" },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: 4, marginBottom: 32 },
  features: { alignSelf: "stretch", gap: 16, marginBottom: 32 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { width: 32, height: 32, borderRadius: 10, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  priceCard: { alignSelf: "stretch", alignItems: "center", borderWidth: 1, borderRadius: 20, borderCurve: "continuous", paddingVertical: 24 },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  secondaryLink: { alignItems: "center", paddingVertical: 12 },
});
