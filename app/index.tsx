import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuthSession } from "../src/features/auth/AuthSession";
import { useTheme } from "../src/theme/ThemeProvider";

export default function Index() {
  const theme = useTheme();
  const session = useAuthSession();

  if (session === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return <Redirect href={session ? "/(tabs)" : "/login"} />;
}
