import { View, type ViewProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

interface AppCardProps extends ViewProps {
  elevated?: boolean;
  padded?: boolean;
}

export function AppCard({ elevated = true, padded = true, style, ...props }: AppCardProps) {
  const theme = useTheme();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        padded && { padding: theme.spacing.md },
        elevated && theme.shadow.sm,
        style,
      ]}
    />
  );
}
