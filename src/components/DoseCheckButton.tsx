import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";

interface DoseCheckButtonProps {
  done: boolean; // taken or skipped — anything that's no longer actionable
  taken: boolean;
  missed?: boolean; // scheduled time has passed and it's still pending
  onPress: () => void;
}

/** The circular check control on a medication row — the app's single most-repeated interaction. */
export function DoseCheckButton({ done, taken, missed = false, onPress }: DoseCheckButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSequence(
      withTiming(0.82, { duration: 90 }),
      withSpring(1, { damping: 9, stiffness: 220 })
    );
    onPress();
  }

  const backgroundColor = taken ? theme.colors.success : done ? theme.colors.surfaceSunken : theme.colors.surface;
  const borderColor = taken
    ? theme.colors.success
    : done
      ? theme.colors.border
      : missed
        ? theme.colors.warning
        : theme.colors.borderStrong;

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      disabled={done}
      accessibilityRole="button"
      accessibilityLabel={taken ? "Taken" : done ? "Skipped" : "Mark taken"}
      accessibilityState={{ disabled: done }}
    >
      <Animated.View style={[styles.circle, theme.simple && styles.circleSimple, { backgroundColor, borderColor }, animatedStyle]}>
        {taken && (
          <Animated.View entering={ZoomIn.duration(220).springify().damping(12)}>
            <Ionicons name="checkmark" size={theme.simple ? 26 : 18} color={theme.colors.textInverse} />
          </Animated.View>
        )}
        {done && !taken && <Ionicons name="close" size={theme.simple ? 22 : 16} color={theme.colors.textTertiary} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circleSimple: { width: 46, height: 46, borderRadius: 23 },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
