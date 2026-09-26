import { useEffect } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

const ICON_SIZE = 22;

/**
 * The app's tab bar: a rounded card that floats just above the content (and the phone's home indicator).
 * The current tab gets a soft pill behind its icon that springs in, the icon lifts a touch and turns to its
 * filled form. Labels stay visible on every tab — they're what make the bar clear at a glance, especially in
 * Urdu and Simple mode. Tabs a screen hides (`href: null`, e.g. Lifestyle in Simple mode) are skipped.
 */
export function AppTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const theme = useTheme();
  // Sit close to the home indicator rather than a full inset above it.
  const bottomGap = insets.bottom > 0 ? Math.max(insets.bottom - 6, 10) : 12;

  return (
    <View style={[styles.outer, { backgroundColor: theme.colors.background, paddingBottom: bottomGap }]}>
      <View
        accessibilityRole="tablist"
        style={[
          styles.bar,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, boxShadow: theme.scheme === "dark" ? "0 8px 24px rgba(0, 0, 0, 0.45)" : "0 10px 28px rgba(34, 31, 27, 0.13)" },
          theme.simple && styles.barSimple,
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const hidden = (StyleSheet.flatten(options.tabBarItemStyle as StyleProp<ViewStyle>) as ViewStyle | undefined)?.display === "none";
          if (hidden) return null;

          const focused = state.index === index;
          const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : (options.title ?? route.name);

          return (
            <TabItem
              key={route.key}
              label={label}
              focused={focused}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              icon={(color) => options.tabBarIcon?.({ focused, color, size: ICON_SIZE })}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  Haptics.selectionAsync().catch(() => undefined);
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

interface TabItemProps {
  label: string;
  focused: boolean;
  accessibilityLabel: string;
  icon: (color: string) => React.ReactNode;
  onPress: () => void;
  onLongPress: () => void;
}

function TabItem({ label, focused, accessibilityLabel, icon, onPress, onLongPress }: TabItemProps) {
  const theme = useTheme();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 15, stiffness: 240, mass: 0.7 });
  }, [focused, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: 0.55 + 0.45 * progress.value }, { scaleY: 0.8 + 0.2 * progress.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -1.5 * progress.value }, { scale: 1 + 0.08 * progress.value }],
  }));

  const color = focused ? theme.colors.accent : theme.colors.textTertiary;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      aria-selected={focused}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.75 }]}
    >
      <View style={[styles.iconWrap, theme.simple && styles.iconWrapSimple]}>
        <Animated.View style={[styles.pill, theme.simple && styles.pillSimple, { backgroundColor: theme.colors.accentSoft }, pillStyle]} />
        <Animated.View style={iconStyle}>{icon(color)}</Animated.View>
      </View>
      {/* One weight for every tab: a bolder active label would be wider than its slot and get cut off. Colour and the pill mark the active tab. */}
      <AppText
        variant="metadata"
        weight="semibold"
        color={focused ? "accent" : "tertiary"}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={theme.simple ? undefined : styles.label}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 10, paddingTop: 6 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 26,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 2,
    paddingVertical: 8,
    elevation: 8,
  },
  barSimple: { paddingVertical: 10 },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 52 },
  iconWrap: { width: 58, height: 32, alignItems: "center", justifyContent: "center" },
  iconWrapSimple: { width: 68, height: 38 },
  pill: { position: "absolute", width: 58, height: 32, borderRadius: 16, borderCurve: "continuous" },
  label: { fontSize: 10.5 },
  pillSimple: { width: 68, height: 38, borderRadius: 19 },
});
