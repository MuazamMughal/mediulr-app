import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

// Expo Go on SDK 53+ dropped notification support and logs a loud error about it on
// every import — src/features/notifications already catches this and degrades gracefully,
// so it's just noise here. Real devices / dev builds don't hit this at all.
LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);

const queryClient = new QueryClient();

function Navigation() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: "600", color: theme.colors.textPrimary },
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTintColor: theme.colors.accent,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
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
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <Navigation />
            <StatusBar style="auto" />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
