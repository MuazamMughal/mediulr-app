/**
 * Mediulr color system. Calm, trustworthy, restrained — a warm neutral base
 * with one confident accent (a mild glowing orange) and muted semantic states.
 * Light mode only for now; `dark` is scaffolded so useColorScheme can switch
 * to it later without touching component code (see docs/ROADMAP.md).
 */

const light = {
  // Surfaces
  background: "#FAF8F5",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  surfaceSunken: "#F3F1EC",
  overlay: "rgba(28, 25, 23, 0.45)",

  // Text
  textPrimary: "#221F1B",
  textSecondary: "#6B655D",
  textTertiary: "#A39C91",
  textInverse: "#FFFFFF",

  // Borders
  border: "#E9E4DC",
  borderStrong: "#D8D1C6",

  // Brand / accent — mild glowing orange
  accent: "#EA7A3D",
  accentSoft: "#FCE6D4",
  accentStrong: "#C75F26",

  // Semantic
  success: "#3C8A5C",
  successSoft: "#E3F1E7",
  warning: "#A67C1E",
  warningSoft: "#FAEFDD",
  danger: "#B3432F",
  dangerSoft: "#F7E7E3",

  // Medication vs visit identity (used sparingly — a tinted left rail, never a wall of color)
  medication: "#EA7A3D",
  medicationSoft: "#FCE6D4",
  visit: "#8A6A3B",
  visitSoft: "#F3EBDC",
} as const;

const dark = {
  background: "#161513",
  surface: "#211F1C",
  surfaceRaised: "#2A2723",
  surfaceSunken: "#0F0E0D",
  overlay: "rgba(0, 0, 0, 0.6)",

  textPrimary: "#F3F0EA",
  textSecondary: "#B4AEA3",
  textTertiary: "#7C766B",
  textInverse: "#161513",

  border: "#332F2A",
  borderStrong: "#453F38",

  accent: "#F5945A",
  accentSoft: "#3D2A1C",
  accentStrong: "#FBB27E",

  success: "#6FBB8B",
  successSoft: "#1E3226",
  warning: "#D9A94E",
  warningSoft: "#3A2C15",
  danger: "#E08872",
  dangerSoft: "#3A241E",

  medication: "#F5945A",
  medicationSoft: "#3D2A1C",
  visit: "#D3B378",
  visitSoft: "#3A2F1D",
} as const;

export type Colors = { [K in keyof typeof light]: string };
export const palettes: Record<"light" | "dark", Colors> = { light, dark };
export type ColorScheme = keyof typeof palettes;
