import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { TabIcon } from "../../src/components/TabIcon";
import { useReminderSync } from "../../src/features/notifications/useReminderSync";
import { useDoseSync } from "../../src/features/offline/useDoseSync";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  useReminderSync();
  useDoseSync();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        // Five tabs share the width, so the standard size is a touch smaller; simple mode has only four and can afford more.
        tabBarLabelStyle: { fontSize: theme.simple ? 13 : 10.5, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          // Room for icon + dot + label (they were clipped in a fixed 64), plus the phone's own bottom inset.
          height: (theme.simple ? 88 : 68) + insets.bottom,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="calendar-outline" activeName="calendar" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: "Medications",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="medkit-outline" activeName="medkit" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Doctor Visits",
          tabBarLabel: "Visits",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="person-outline" activeName="person" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="lifestyle"
        options={{
          title: "Lifestyle",
          // Simple mode keeps the app to the essentials: today, medications, visits, profile.
          href: theme.simple ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="leaf-outline" activeName="leaf" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="person-circle-outline"
              activeName="person-circle"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
