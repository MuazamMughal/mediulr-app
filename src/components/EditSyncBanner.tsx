import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { useI18n } from "../i18n/LocaleProvider";
import { useActiveProfile } from "../features/profile/ActiveProfile";
import { discardFailedEdits, retryFailedEdits } from "../features/offline/editApi";
import { usePendingEdits } from "../features/offline/useEditSync";
import { AppText } from "./AppText";

export function EditSyncBanner() {
  const theme = useTheme();
  const { t, tn } = useI18n();
  const { profile } = useActiveProfile();
  const edits = usePendingEdits().filter((edit) => edit.userId === profile?.ownerId);
  if (edits.length === 0) return null;
  const failed = edits.some((edit) => !!edit.failed);
  return (
    <View style={[styles.row, { backgroundColor: failed ? theme.colors.dangerSoft : theme.colors.warningSoft }]} accessibilityRole="alert">
      <Ionicons name={failed ? "alert-circle-outline" : "cloud-offline-outline"} size={16} color={failed ? theme.colors.danger : theme.colors.warning} />
      <AppText variant="caption" color={failed ? "danger" : "warning"} style={{ flex: 1 }}>
        {failed ? t("editSync.failed") : tn("editSync.pending", edits.length)}
      </AppText>
      {failed && (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel={t("editSync.retry")} onPress={() => void retryFailedEdits()}>
            <AppText variant="caption" color="accent" weight="semibold">{t("editSync.retry")}</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("editSync.discard")} onPress={() =>
            Alert.alert(t("editSync.discardTitle"), t("editSync.discardBody"), [
              { text: t("common.cancel"), style: "cancel" },
              { text: t("editSync.discard"), style: "destructive", onPress: () => void discardFailedEdits() },
            ])
          }>
            <AppText variant="caption" color="danger">{t("editSync.discard")}</AppText>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 10, marginBottom: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderCurve: "continuous" },
});
