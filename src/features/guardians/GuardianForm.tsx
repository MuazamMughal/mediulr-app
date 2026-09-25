import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { AppText } from "../../components/AppText";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { SheetHeader } from "../../components/SheetHeader";
import { SegmentedChips } from "../../components/SegmentedChips";
import { friendlyError } from "../../lib/friendlyError";
import { useActiveProfile } from "../profile/ActiveProfile";
import { RELATIONSHIPS, isValidPhone, normalizePhone } from "./logic";
import { useAddGuardian, useDeleteGuardian, useUpdateGuardian } from "./useGuardians";
import type { Guardian } from "../../types/domain";

type Props = { mode: "create" } | { mode: "edit"; guardian: Guardian };

/** Add or edit a guardian: a name, a phone number, and whether to offer "tell them" when a dose is missed. */
export function GuardianForm(props: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useActiveProfile();
  const guardian = props.mode === "edit" ? props.guardian : null;
  const editing = !!guardian;

  const addGuardian = useAddGuardian(profile?.id);
  const updateGuardian = useUpdateGuardian();
  const deleteGuardian = useDeleteGuardian();

  const [name, setName] = useState(guardian?.name ?? "");
  const [relationship, setRelationship] = useState<string | null>(guardian?.relationship ?? null);
  const [phone, setPhone] = useState(guardian?.phone ?? "");
  const [notify, setNotify] = useState(guardian?.notifyOnMissed ?? true);

  const trimmedName = name.trim();
  const phoneOk = isValidPhone(phone);
  const changed =
    !guardian ||
    trimmedName !== guardian.name ||
    relationship !== guardian.relationship ||
    normalizePhone(phone) !== guardian.phone ||
    notify !== guardian.notifyOnMissed;
  const canSave = trimmedName.length > 0 && phoneOk && !!profile && changed;

  async function handleSave() {
    if (!canSave) return;
    const input = { name: trimmedName, relationship, phone: normalizePhone(phone), notifyOnMissed: notify };
    try {
      if (guardian) await updateGuardian.mutateAsync({ id: guardian.id, input });
      else await addGuardian.mutateAsync(input);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.dismiss();
    } catch (err) {
      const message = String((err as { message?: string } | null)?.message ?? "");
      Alert.alert(
        guardian ? "Couldn't update guardian" : "Couldn't add guardian",
        message.includes("at most 3") ? "You can have up to 3 guardians." : friendlyError(err)
      );
    }
  }

  function handleDelete() {
    if (!guardian) return;
    Alert.alert(`Remove ${guardian.name}?`, "They won't be offered as someone to tell when you miss a dose.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          deleteGuardian.mutate(guardian.id, {
            onSuccess: () => router.dismiss(),
            onError: (err) => Alert.alert("Couldn't remove guardian", friendlyError(err)),
          }),
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SheetHeader title={editing ? "Edit guardian" : "Add guardian"} onClose={() => router.dismiss()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
        <AppText variant="bodySmall" color="secondary" style={styles.subheading}>
          {profile && !profile.isSelf ? `A guardian for ${profile.displayName}. ` : ""}Someone you trust to be told when a dose is missed.
        </AppText>

        <View style={styles.field}>
          <AppInput label="Name" placeholder="e.g. Mom" value={name} onChangeText={setName} autoFocus={!editing} maxLength={80} />
        </View>

        <View style={styles.field}>
          <AppInput
            label="Phone number"
            placeholder="e.g. +1 555 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={24}
            error={phone.trim().length > 0 && !phoneOk ? "Enter 7 to 15 digits, with country code if it's abroad" : undefined}
          />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" color="secondary" style={styles.label}>
            Who are they to you? (optional)
          </AppText>
          <SegmentedChips
            options={[...RELATIONSHIPS]}
            selectedIndex={relationship ? RELATIONSHIPS.indexOf(relationship as (typeof RELATIONSHIPS)[number]) : -1}
            onSelect={(i) => setRelationship((cur) => (cur === RELATIONSHIPS[i] ? null : RELATIONSHIPS[i]))}
          />
        </View>

        <View style={[styles.switchRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyMedium" weight="semibold">
              Offer to tell them about missed doses
            </AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2, lineHeight: 17 }}>
              A "Tell {trimmedName.split(" ")[0] || "them"}" button appears on a missed dose. You choose whether to send.
            </AppText>
          </View>
          <Switch
            value={notify}
            onValueChange={setNotify}
            trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
            accessibilityLabel="Offer to tell this guardian about missed doses"
          />
        </View>

        {editing && (
          <View style={styles.destructive}>
            <AppButton label="Remove guardian" variant="destructive" onPress={handleDelete} loading={deleteGuardian.isPending} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <AppButton
          label={editing ? "Save changes" : "Add guardian"}
          onPress={handleSave}
          disabled={!canSave}
          loading={addGuardian.isPending || updateGuardian.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  subheading: { marginBottom: 22, lineHeight: 20 },
  field: { marginBottom: 18 },
  label: { marginBottom: 8, marginLeft: 2 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, borderCurve: "continuous", padding: 14, marginTop: 4 },
  destructive: { marginTop: 24 },
  footer: { padding: 16, borderTopWidth: 1 },
});
