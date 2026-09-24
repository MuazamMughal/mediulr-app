import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerTitleStyle: { fontWeight: "600" } }}>
      <Tabs.Screen name="index" options={{ title: "Calendar" }} />
      <Tabs.Screen name="medications" options={{ title: "Medications" }} />
      <Tabs.Screen name="appointments" options={{ title: "Doctor Visits" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
