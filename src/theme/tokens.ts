/** Spacing, radius, shadow, and typography tokens — the rest of the design system besides color. */

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const shadow = {
  none: {},
  sm: {
    shadowColor: "#221F1B",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: "#221F1B",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
} as const;

/** A restrained type scale — six sizes, three weights. Line heights set for easy scanning. */
export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "700" as const, letterSpacing: -0.5 },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: "700" as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "600" as const, letterSpacing: -0.2 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: "600" as const, letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: "400" as const },
  bodyMedium: { fontSize: 16, lineHeight: 23, fontWeight: "500" as const },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: "500" as const },
  metadata: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const, letterSpacing: 0.2 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;
