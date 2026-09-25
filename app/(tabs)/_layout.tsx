import { Tabs } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";
import { TabIcon } from "../../src/components/TabIcon";
import { useReminderSync } from "../../src/features/notifications/useReminderSync";

export default function TabsLayout() {
  const theme = useTheme();
  useReminderSync();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 10,
          paddingBottom: 10,
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
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="person-outline" activeName="person" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="lifestyle"
        options={{
          title: "Lifestyle",
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
