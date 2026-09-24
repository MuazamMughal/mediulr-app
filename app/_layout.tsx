import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerTitleStyle: { fontWeight: "600" } }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
            <Stack.Screen name="medication/new" options={{ title: "Add medication", presentation: "modal" }} />
            <Stack.Screen name="medication/[id]" options={{ title: "Medication" }} />
            <Stack.Screen name="appointment/new" options={{ title: "Add doctor visit", presentation: "modal" }} />
            <Stack.Screen name="appointment/[id]" options={{ title: "Doctor visit" }} />
            <Stack.Screen name="paywall" options={{ title: "Mediulr Premium", presentation: "modal" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
