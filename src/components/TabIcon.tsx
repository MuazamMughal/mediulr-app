import { View, type ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { ZoomIn } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  activeName: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  size: number;
  focused: boolean;
}

/** Tab bar icon with a small animated dot beneath it when active — the "current destination" cue. */
export function TabIcon({ name, activeName, color, size, focused }: TabIconProps) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 3 }}>
      <Ionicons name={focused ? activeName : name} size={size} color={color} />
      <View style={{ height: 4, width: 4 }}>
        {focused && (
          <Animated.View
            entering={ZoomIn.duration(180).springify().damping(14)}
            style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.accent }}
          />
        )}
      </View>
    </View>
  );
}
