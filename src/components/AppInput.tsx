import { useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function AppInput({ label, error, style, onFocus, onBlur, ...props }: AppInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? theme.colors.danger : focused ? theme.colors.accent : theme.colors.border;

  return (
    <View style={styles.container}>
      {label && (
        <AppText variant="caption" color="secondary" style={styles.label}>
          {label}
        </AppText>
      )}
      <TextInput
        placeholderTextColor={theme.colors.textTertiary}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            borderWidth: 1.5,
            borderColor,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.sm,
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
          },
          style,
        ]}
      />
      {error && (
        <AppText variant="caption" color="danger" style={styles.error}>
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { marginLeft: 2 },
  error: { marginLeft: 2 },
});
