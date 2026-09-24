import { View, type ViewProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export function Divider(props: ViewProps) {
  const theme = useTheme();
  return <View {...props} style={[{ height: 1, backgroundColor: theme.colors.border }, props.style]} />;
}
