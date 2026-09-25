import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { friendlyError } from "../../src/lib/friendlyError";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import { useAppointments, useUpdatePostVisitNotes } from "../../src/features/appointments/useAppointments";

export default function AppointmentDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useActiveProfile();
  const { data: appointments, isSuccess } = useAppointments(profile?.id);
  const updateNotes = useUpdatePostVisitNotes(profile?.id);

  const appointment = appointments?.find((a) => a.id === id);

  // Deleted (from the edit sheet): there's nothing left to show, so go back to the list.
  useEffect(() => {
    if (isSuccess && !appointment) router.back();
  }, [isSuccess, appointment]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start empty and adopt the saved notes once they've loaded. `dirty` means "the user has typed something not yet
  // saved" — only then may we write, so opening this screen before the data arrives can never overwrite real notes with blank.
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (appointment && !dirty) setNotes(appointment.postVisitNotes ?? "");
  }, [appointment?.id, appointment?.postVisitNotes, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving the screen mid-typing (swipe back) doesn't always fire onBlur, so flush unsaved text on unmount too.
  const pending = useRef({ id: undefined as string | undefined, notes: "", dirty: false });
  pending.current = { id: appointment?.id, notes, dirty };
  const mutateRef = useRef(updateNotes.mutate);
  mutateRef.current = updateNotes.mutate;
  useEffect(
    () => () => {
      const p = pending.current;
      if (p.dirty && p.id) mutateRef.current({ id: p.id, notes: p.notes.trim() || null });
    },
    []
  );

  function saveNotes() {
    if (!appointment || !dirty) return;
    updateNotes.mutate(
      { id: appointment.id, notes: notes.trim() || null },
      {
        onSuccess: () => setDirty(false),
        onError: (err) => Alert.alert("Couldn't save notes", friendlyError(err)),
      }
    );
  }

  if (!appointment) return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.hero, { backgroundColor: theme.colors.visitSoft }]}>
          <Ionicons name="medical" size={22} color={theme.colors.visit} />
        </View>
        <AppText variant="h1" style={styles.name}>
          {appointment.providerName}
        </AppText>
        {appointment.specialty && (
          <AppText variant="body" color="secondary">
            {appointment.specialty}
          </AppText>
        )}

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={theme.colors.textTertiary} />
            <AppText variant="bodyMedium">
              {new Date(appointment.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </AppText>
          </View>
          {appointment.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={theme.colors.textTertiary} />
              <AppText variant="bodyMedium">{appointment.location}</AppText>
            </View>
          )}
        </View>

        {appointment.preVisitNotes && (
          <View style={styles.section}>
            <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
              BEFORE YOUR VISIT
            </AppText>
            <View style={[styles.softSurface, { backgroundColor: theme.colors.visitSoft }]}>
              <AppText variant="body">{appointment.preVisitNotes}</AppText>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
            WHAT THE DOCTOR SAID
          </AppText>
          <TextInput
            style={[
              styles.notesInput,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.textPrimary },
            ]}
            placeholder="Notes, next steps…"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            value={notes}
            onChangeText={(text) => {
              setNotes(text);
              setDirty(true);
            }}
            onBlur={saveNotes}
          />
        </View>

        <View style={{ marginTop: 24 }}>
          <AppButton label="Edit visit" variant="secondary" onPress={() => router.push(`/appointment/edit/${appointment.id}`)} />
        </View>

        <AppText variant="caption" color="tertiary" style={styles.hint}>
          This stays on your device and account only — Mediulr never sends visit notes to a provider.
        </AppText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  hero: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  name: { marginBottom: 2 },
  details: { marginTop: 28, gap: 14 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  section: { marginTop: 28 },
  sectionLabel: { marginBottom: 10, letterSpacing: 0.4 },
  softSurface: { borderRadius: 14, borderCurve: "continuous", padding: 14 },
  notesInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: 14,
    minHeight: 110,
    textAlignVertical: "top",
    fontSize: 15,
    lineHeight: 21,
  },
  hint: { marginTop: 20, textAlign: "center", lineHeight: 17 },
});
