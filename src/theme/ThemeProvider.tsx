import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { palettes, type ColorScheme, type Colors } from "./colors";
import { radius, shadow, spacing, typography, motion, scaleTypography, SIMPLE_MODE_TEXT_SCALE } from "./tokens";
import { usePreferences } from "../features/preferences/Preferences";

interface Theme {
  scheme: ColorScheme;
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: typeof shadow;
  typography: typeof typography;
  /** Simple mode: larger text and controls, fewer things on screen. */
  simple: boolean;
  motion: typeof motion;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = systemScheme === "dark" ? "dark" : "light";
  const simple = usePreferences().prefs.simpleMode;

  const theme = useMemo<Theme>(
    () => ({
      scheme,
      colors: palettes[scheme],
      spacing,
      radius,
      shadow,
      typography: scaleTypography(simple ? SIMPLE_MODE_TEXT_SCALE : 1),
      motion,
      simple,
    }),
    [scheme, simple]
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
