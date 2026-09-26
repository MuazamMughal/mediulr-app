import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { AppButton } from "./AppButton";
import { SheetHeader } from "./SheetHeader";
import { useI18n } from "../i18n/LocaleProvider";

interface SheetStatusProps {
  title: string;
  onClose: () => void;
  /** Omit while loading; pass a message (and optionally a retry) for a failure or a missing item. */
  message?: string;
  onRetry?: () => void;
}

/** A sheet's loading / failed / not-found body, so an edit sheet never shows a blank void. */
export function SheetStatus({ title, onClose, message, onRetry }: SheetStatusProps) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SheetHeader title={title} onClose={onClose} />
      <View style={styles.center}>
        {message ? (
          <>
            <AppText variant="bodySmall" color="secondary" style={styles.message}>
              {message}
            </AppText>
            <View style={styles.actions}>
              {onRetry && <AppButton label={t("common.tryAgain")} onPress={onRetry} fullWidth={false} />}
              <AppButton label={t("common.close")} variant="ghost" onPress={onClose} fullWidth={false} />
            </View>
          </>
        ) : (
          <ActivityIndicator color={theme.colors.accent} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 80 },
  message: { textAlign: "center", lineHeight: 20, marginBottom: 16 },
  actions: { alignItems: "center", gap: 4 },
});
