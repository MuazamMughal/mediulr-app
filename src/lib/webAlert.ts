import { Alert, Platform } from "react-native";
import { pickWebAlertButton, webAlertMessage } from "./webAlertLogic";

/**
 * `Alert.alert` does nothing on web, so every confirmation in the app (delete, stop, sign out…) would silently
 * swallow the tap. On web only, route it through the browser's own dialogs: one button → an info box, two or more
 * → OK/Cancel. Phones are untouched.
 */
if (Platform.OS === "web" && typeof window !== "undefined") {
  Alert.alert = (title, message, buttons) => {
    const text = webAlertMessage(title, message);
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      (buttons?.[0]?.onPress as (() => void) | undefined)?.();
      return;
    }
    (pickWebAlertButton(buttons, window.confirm(text))?.onPress as (() => void) | undefined)?.();
  };
}
