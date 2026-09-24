import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

export function Skeleton({ width = "100%", height = 16, radius = 8 }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.colors.surfaceSunken },
        style,
      ]}
    />
  );
}

/** A row-shaped skeleton matching TimelineItem/VisitCard proportions, for list loading states. */
export function SkeletonRow() {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderColor: theme.colors.border }]}>
      <Skeleton width={54} height={14} />
      <View style={styles.body}>
        <Skeleton width="70%" height={16} />
        <View style={{ height: 8 }} />
        <Skeleton width="45%" height={13} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 16, paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  body: { flex: 1, justifyContent: "center" },
});
