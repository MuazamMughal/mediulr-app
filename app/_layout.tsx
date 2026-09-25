import { useEffect } from "react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { PreferencesProvider } from "../src/features/preferences/Preferences";
import { ActiveProfileProvider } from "../src/features/profile/ActiveProfile";
import { cancelAllReminders } from "../src/features/notifications/scheduleNotifications";
import { doseOutbox } from "../src/features/offline/doseOutbox";
import { useNotificationActions } from "../src/features/notifications/useNotificationActions";
import { supabase } from "../src/lib/supabase";

// Expo Go on SDK 53+ dropped notification support and logs a loud error about it on
// every import — src/features/notifications already catches this and degrades gracefully,
// so it's just noise here. Real devices / dev builds don't hit this at all.
LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);

const CACHE_MAX_AGE = 3 * 24 * 3600_000;

// Cached data must outlive the in-memory default (5 minutes) or it would be discarded before it could be saved.
const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: CACHE_MAX_AGE } } });

/**
 * A copy of today's schedule is kept on the phone so the app opens (and shows what's due) with no signal.
 * Only the schedule itself is saved — profiles, medications, visits and the calendar — never food, exercise or
 * guardians' phone numbers. It is wiped on sign-out, and dropped after three days.
 */
const CACHED_QUERIES = new Set(["profiles", "medications", "appointments", "calendarEvents"]);
const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: "mediulr:query-cache", throttleTime: 1000 });

/** When anyone signs out, drop every cached query and scheduled reminder so the next person never sees or hears the last one's data. */
function AuthSideEffects() {
  const client = useQueryClient();
  useNotificationActions();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        client.clear();
        persister.removeClient();
        doseOutbox.clear();
        cancelAllReminders();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [client]);
  return null;
}

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
      <Stack.Screen
        name="medication/new"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen name="medication/[id]" options={{ title: "Medication" }} />
      <Stack.Screen
        name="appointment/new"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen name="appointment/[id]" options={{ title: "Doctor visit" }} />
      <Stack.Screen
        name="medication/edit/[id]"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="appointment/edit/[id]"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="food/new"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="food/[id]"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="exercise/new"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="exercise/[id]"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen name="guardians" options={{ title: "Guardians" }} />
      <Stack.Screen
        name="guardian/new"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="guardian/[id]"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="paywall"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <ThemeProvider>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{
                persister,
                maxAge: CACHE_MAX_AGE,
                buster: "1",
                dehydrateOptions: {
                  shouldDehydrateQuery: (query) => query.state.status === "success" && CACHED_QUERIES.has(String(query.queryKey[0])),
                },
              }}
            >
              <ActiveProfileProvider>
                <AuthSideEffects />
                <Navigation />
                <StatusBar style="auto" />
              </ActiveProfileProvider>
            </PersistQueryClientProvider>
          </ThemeProvider>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
