import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n/LocaleProvider";

/** The "›" that points to what comes next — flipped to "‹" in right-to-left languages. */
export function Chevron({ size = 16, color }: { size?: number; color: string }) {
  const { isRTL } = useI18n();
  return <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={size} color={color} />;
}
