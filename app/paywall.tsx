import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../src/components/AppText";
import { AppButton } from "../src/components/AppButton";
import { useI18n } from "../src/i18n/LocaleProvider";
import { useTheme } from "../src/theme/ThemeProvider";

/** Deep links to the former purchase mockup remain safe until billing is implemented. */
export default function PaywallScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 18,
    padding: 28, backgroundColor: theme.colors.background }}>
    <Ionicons name="sparkles-outline" size={42} color={theme.colors.accent} />
    <AppText variant="h1" style={{ textAlign: "center" }}>{t("paywall.unavailableTitle")}</AppText>
    <AppText color="secondary" style={{ textAlign: "center" }}>{t("paywall.unavailableBody")}</AppText>
    <AppButton label={t("paywall.backToApp")} onPress={() => router.replace("/(tabs)")} />
  </View>;
}
