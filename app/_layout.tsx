import "../src/lib/webAlert"; // makes Alert dialogs work on web (no effect on phones)
import { useEffect, useRef } from "react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { PreferencesProvider } from "../src/features/preferences/Preferences";
import { LocaleProvider, useI18n } from "../src/i18n/LocaleProvider";
import { ActiveProfileProvider } from "../src/features/profile/ActiveProfile";
import { cancelAllReminders } from "../src/features/notifications/scheduleNotifications";
import { doseOutbox } from "../src/features/offline/doseOutbox";
import { clearOfflineEdits } from "../src/features/offline/editApi";
import { useEditSync } from "../src/features/offline/useEditSync";
import { useNotificationActions } from "../src/features/notifications/useNotificationActions";
import { supabase } from "../src/lib/supabase";
import { setSharedQueryClient } from "../src/lib/queryClientRef";
import { AuthSessionProvider, useAuthSession } from "../src/features/auth/AuthSession";

// Expo Go on SDK 53+ dropped notification support and logs a loud error about it on
// every import — src/features/notifications already catches this and degrades gracefully,
// so it's just noise here. Real devices / dev builds don't hit this at all.
LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);

const CACHE_MAX_AGE = 3 * 24 * 3600_000;

// Cached data must outlive the in-memory default (5 minutes) or it would be discarded before it could be saved.
const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: CACHE_MAX_AGE } } });
setSharedQueryClient(queryClient);

/**
 * Persist fetched query families so previously opened screens can render without a signal.
 * The edit journal and fetched record snapshots are stored separately by features/offline.
 * Sign-out clears all three device stores.
 */
const CACHED_QUERIES = new Set(["profiles", "medications", "appointments", "calendarEvents", "customReminders", "foodEntries", "exerciseEntries", "guardians"]);
const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: "mediulr:query-cache", throttleTime: 1000 });

/** When anyone signs out, drop every cached query and scheduled reminder so the next person never sees or hears the last one's data. */
function AuthSideEffects() {
  const client = useQueryClient();
  const previousUserId = useRef<string | null>(null);
  useNotificationActions();
  useEditSync();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user.id ?? null;
      if (event === "SIGNED_OUT" || (previousUserId.current && nextUserId && previousUserId.current !== nextUserId)) {
        client.clear();
        void persister.removeClient();
        void doseOutbox.clear();
        void clearOfflineEdits().catch(() => undefined);
        void cancelAllReminders();
      }
      previousUserId.current = nextUserId;
    });
    return () => data.subscription.unsubscribe();
  }, [client]);
  return null;
}

function Navigation() {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const session = useAuthSession();

  // Resolve the persisted session before evaluating guards, preserving private deep links.
  if (session === undefined) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.accent} /></View>;
  }

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
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
      <Stack.Protected guard={!!session}>
      <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="medication/new"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen name="medication/[id]" options={{ title: t("nav.medication") }} />
      <Stack.Screen
        name="appointment/new"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen name="appointment/[id]" options={{ title: t("nav.doctorVisit") }} />
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
      <Stack.Screen name="guardians" options={{ title: t("nav.guardians") }} />
      <Stack.Screen
        name="guardian/new"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="guardian/[id]"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen name="reminders" options={{ title: t("nav.reminders") }} />
      <Stack.Screen
        name="reminder/new"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="reminder/[id]"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="paywall"
        options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [1.0], sheetGrabberVisible: true }}
      />
      <Stack.Screen name="settings" options={{ title: t("nav.settings") }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <LocaleProvider>
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
              <AuthSessionProvider>
                <ActiveProfileProvider>
                  <AuthSideEffects />
                  <Navigation />
                  <StatusBar style="auto" />
                </ActiveProfileProvider>
              </AuthSessionProvider>
            </PersistQueryClientProvider>
          </ThemeProvider>
          </LocaleProvider>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
