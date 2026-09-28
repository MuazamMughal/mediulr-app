import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { parseAuthLink } from "../../src/features/auth/parseAuthLink";
import { useAuthSession } from "../../src/features/auth/AuthSession";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useI18n } from "../../src/i18n/LocaleProvider";

export default function AuthCallback() {
  const url = Linking.useURL();
  const handled = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState<"/auth/reset-password" | "/onboarding" | "/(tabs)" | null>(null);
  const session = useAuthSession();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;
    void (async () => {
      try {
        const link = parseAuthLink(url);
        if (link.kind === "session") {
          const { data, error } = await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
          if (error) throw error;
          if (!data.session) throw new Error("No session was returned for this link");
        } else if (link.kind === "code") {
          const { data, error } = await supabase.auth.exchangeCodeForSession(link.code);
          if (error) throw error;
          if (!data.session) throw new Error("No session was returned for this link");
        } else {
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
          if (error) throw error;
          if (!data.session) throw new Error("No session was returned for this link");
        }
        setDestination(link.recovery ? "/auth/reset-password" : link.newAccount ? "/onboarding" : "/(tabs)");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();
  }, [url]);

  useEffect(() => {
    if (session && destination) router.replace(destination);
  }, [session, destination, router]);

  return <View style={{ flex: 1, justifyContent: "center", gap: 16, padding: 28, backgroundColor: theme.colors.background }}>
    {error ? <>
      <AppText variant="h1">{t("auth.linkFailed")}</AppText>
      <AppText color="secondary">{error}</AppText>
      <AppButton label={t("auth.backToSignIn")} onPress={() => router.replace("/login")} />
    </> : <>
      <ActivityIndicator color={theme.colors.accent} />
      <AppText color="secondary" style={{ textAlign: "center" }}>{t("auth.finishingSignIn")}</AppText>
    </>}
  </View>;
}
