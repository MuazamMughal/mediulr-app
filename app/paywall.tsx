import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/ThemeProvider";
import { AppText } from "../src/components/AppText";
import { AppButton } from "../src/components/AppButton";

const FEATURES = [
  { icon: "people-outline" as const, label: "Unlimited family & caregiver profiles" },
  { icon: "document-text-outline" as const, label: "Health-record PDF export" },
  { icon: "notifications-outline" as const, label: "Priority reminder customization" },
];

/**
 * Subscription screen stub. Real purchase flow wires up here via RevenueCat
 * (react-native-purchases) once App Store Connect / Play Console products exist
 * — see docs/SETUP.md §7.
 */
export default function PaywallScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.badge, { backgroundColor: theme.colors.accentSoft }]}>
          <Ionicons name="sparkles" size={22} color={theme.colors.accent} />
        </View>

        <AppText variant="h1" style={styles.title}>
          Mediulr Premium
        </AppText>
        <AppText variant="body" color="secondary" style={styles.subtitle}>
          A better way to stay on top of your health.
        </AppText>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: theme.colors.surfaceSunken }]}>
                <Ionicons name={f.icon} size={16} color={theme.colors.accent} />
              </View>
              <AppText variant="body" style={{ flex: 1 }}>
                {f.label}
              </AppText>
            </View>
          ))}
        </View>

        <View style={[styles.priceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <AppText variant="display">$2.99</AppText>
          <AppText variant="bodySmall" color="secondary">
            per month · 7-day free trial
          </AppText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <AppButton
          label="Start free trial"
          onPress={() => {
            // TODO: wire up react-native-purchases purchase flow.
            router.back();
          }}
        />
        <Pressable style={styles.secondaryLink} onPress={() => router.back()}>
          <AppText variant="bodySmall" color="tertiary">
            Not now
          </AppText>
        </Pressable>
        <Pressable style={styles.secondaryLink}>
          <AppText variant="caption" color="tertiary">
            Restore purchase
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
  featureIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  priceCard: { alignSelf: "stretch", alignItems: "center", borderWidth: 1, borderRadius: 20, paddingVertical: 24 },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  secondaryLink: { alignItems: "center", paddingVertical: 12 },
});
