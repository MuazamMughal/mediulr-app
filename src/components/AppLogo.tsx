import { Image, type ImageStyle, type StyleProp } from "react-native";

const ICON = require("../../assets/icon.png");

/** The actual Mediulr "M" mark (same source as the app icon) — the in-app logo wherever one is shown. */
export function AppLogo({ size = 56, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={ICON}
      style={[{ width: size, height: size, borderRadius: size * 0.28 }, style]}
      resizeMode="cover"
    />
  );
}
