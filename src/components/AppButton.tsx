import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "md" | "lg";

interface AppButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export function AppButton({
  label,
  variant = "primary",
  size = "lg",
  loading = false,
  fullWidth = true,
  disabled,
  ...props
}: AppButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const backgrounds: Record<Variant, string> = {
    primary: theme.colors.accent,
    secondary: theme.colors.surfaceSunken,
    ghost: "transparent",
    destructive: theme.colors.dangerSoft,
  };
  const textColors: Record<Variant, "inverse" | "primary" | "secondary" | "danger"> = {
    primary: "inverse",
    secondary: "primary",
    ghost: "secondary",
    destructive: "danger",
  };

  return (
    <Pressable
      disabled={isDisabled}
      {...props}
      style={({ pressed }) => [
        styles.base,
        size === "lg" ? styles.lg : styles.md,
        { backgroundColor: backgrounds[variant] },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? theme.colors.textInverse : theme.colors.accent} />
      ) : (
        <AppText variant="bodyMedium" color={textColors[variant]} weight="semibold">
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  lg: { paddingVertical: 16, paddingHorizontal: 20 },
  md: { paddingVertical: 12, paddingHorizontal: 16 },
  fullWidth: { alignSelf: "stretch" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
