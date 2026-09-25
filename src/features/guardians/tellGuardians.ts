import { Alert, Linking, Platform, Share } from "react-native";
import { buildMissedDoseMessage, smsUrl, type MissedDoseMessageInput } from "./logic";
import type { Guardian } from "../../types/domain";

/**
 * Opens the patient's own messaging app with a prefilled note to their guardians. Nothing is sent until the
 * patient taps Send there. If no messaging app can open (tablets, simulators), falls back to the share sheet.
 */
export async function tellGuardians(guardians: Guardian[], message: MissedDoseMessageInput): Promise<void> {
  if (guardians.length === 0) return;
  const body = buildMissedDoseMessage(message);
  const url = smsUrl(
    guardians.map((g) => g.phone),
    body,
    Platform.OS === "ios" ? "ios" : "android"
  );
  try {
    await Linking.openURL(url);
  } catch {
    try {
      await Share.share({ message: body });
    } catch {
      Alert.alert("Couldn't open messages", "You can tell them yourself:\n\n" + body);
    }
  }
}
