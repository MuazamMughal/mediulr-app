import { Text, type TextProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { TypographyVariant } from "../theme/tokens";

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: "primary" | "secondary" | "tertiary" | "inverse" | "accent" | "danger" | "success" | "warning";
  weight?: "regular" | "medium" | "semibold" | "bold";
}

const weightMap = { regular: "400", medium: "500", semibold: "600", bold: "700" } as const;

export function AppText({ variant = "body", color = "primary", weight, style, ...props }: AppTextProps) {
  const theme = useTheme();
  const colorValue =
    color === "primary"
      ? theme.colors.textPrimary
      : color === "secondary"
        ? theme.colors.textSecondary
        : color === "tertiary"
          ? theme.colors.textTertiary
          : color === "inverse"
            ? theme.colors.textInverse
            : color === "accent"
              ? theme.colors.accent
              : color === "danger"
                ? theme.colors.danger
                : color === "success"
                  ? theme.colors.success
                  : theme.colors.warning;

  return (
    <Text
      {...props}
      style={[
        theme.typography[variant],
        { color: colorValue },
        weight ? { fontWeight: weightMap[weight] } : null,
        style,
      ]}
    />
  );
}
