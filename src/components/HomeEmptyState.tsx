import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { AppButton } from "./AppButton";

interface HomeEmptyStateProps {
  onAddMedication: () => void;
  onAddVisit: () => void;
}

/** The home screen before anything exists: one illustration, one primary action, one quiet secondary link. */
export function HomeEmptyState({ onAddMedication, onAddVisit }: HomeEmptyStateProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [float]);

  const capsuleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }, { rotate: "-32deg" }],
  }));

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Illustration */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.art}>
        <View style={[styles.glowOuter, { backgroundColor: theme.colors.surfaceSunken }]} />
        <View style={[styles.glowInner, { backgroundColor: theme.colors.accentSoft }]} />
        <Animated.View style={[styles.capsule, { borderColor: theme.colors.accent }, capsuleStyle]}>
          <View style={[styles.capsuleHalf, { backgroundColor: theme.colors.accent }]} />
          <View style={[styles.capsuleHalf, { backgroundColor: theme.colors.surface }]} />
        </Animated.View>
        <View style={[styles.dot, styles.dotA, { backgroundColor: theme.colors.accent }]} />
        <View style={[styles.dot, styles.dotB, { backgroundColor: theme.colors.visit }]} />
        <View style={[styles.dot, styles.dotC, { backgroundColor: theme.colors.accentSoft }]} />
      </Animated.View>

      {/* Copy */}
      <Animated.View entering={FadeInDown.duration(450).delay(120)} style={styles.copy}>
        <AppText variant="h1" style={styles.title}>
          Let's set up your first medication
        </AppText>
        <AppText variant="body" color="secondary" style={styles.subtitle}>
          Add it once and Mediulr builds your daily schedule, then reminds you at exactly the right time.
        </AppText>
      </Animated.View>

      {/* A ghost preview of what the day will look like — shapes only, no made-up data */}
      <Animated.View entering={FadeInDown.duration(450).delay(220)} style={styles.preview}>
        <AppText variant="metadata" color="tertiary" style={styles.previewLabel}>
          YOUR DAY WILL APPEAR HERE
        </AppText>
        {[1, 0.6, 0.32].map((opacity, i) => (
          <View key={i} style={[styles.ghostRow, { opacity }]}>
            <View style={[styles.ghostAvatar, { backgroundColor: i === 0 ? theme.colors.accentSoft : theme.colors.surfaceSunken }]} />
            <View style={{ flex: 1, gap: 7 }}>
              <View style={[styles.ghostBar, { width: i === 1 ? "44%" : "58%", backgroundColor: theme.colors.surfaceSunken }]} />
              <View style={[styles.ghostBar, { width: "30%", height: 7, backgroundColor: theme.colors.surfaceSunken }]} />
            </View>
            <View style={[styles.ghostCheck, { borderColor: theme.colors.border }]} />
          </View>
        ))}
      </Animated.View>

      {/* The one action */}
      <Animated.View entering={FadeInDown.duration(450).delay(320)} style={styles.actions}>
        <AppButton label="Add your first medication" onPress={onAddMedication} />
        <Pressable
          onPress={onAddVisit}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
        >
          <AppText variant="bodySmall" color="secondary">
            Or{" "}
            <AppText variant="bodySmall" color="accent" weight="semibold">
              add a doctor visit
            </AppText>
          </AppText>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 28, paddingTop: 24, alignItems: "stretch" },
  art: { height: 190, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  glowOuter: { position: "absolute", width: 190, height: 190, borderRadius: 95, opacity: 0.55 },
  glowInner: { position: "absolute", width: 128, height: 128, borderRadius: 64 },
  capsule: {
    width: 104,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    flexDirection: "row",
    overflow: "hidden",
  },
  capsuleHalf: { flex: 1 },
  dot: { position: "absolute", borderRadius: 999 },
  dotA: { width: 10, height: 10, top: 34, right: 78, opacity: 0.85 },
  dotB: { width: 7, height: 7, bottom: 38, left: 74, opacity: 0.8 },
  dotC: { width: 14, height: 14, top: 60, left: 62 },
  copy: { alignItems: "center" },
  title: { textAlign: "center", marginBottom: 8 },
  subtitle: { textAlign: "center", lineHeight: 23, maxWidth: 320 },
  preview: { marginTop: 30, gap: 14 },
  previewLabel: { letterSpacing: 0.6, marginBottom: 2 },
  ghostRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  ghostAvatar: { width: 40, height: 40, borderRadius: 13, borderCurve: "continuous" },
  ghostBar: { height: 10, borderRadius: 5 },
  ghostCheck: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5 },
  actions: { marginTop: 34 },
  link: { alignItems: "center", paddingVertical: 16 },
});
