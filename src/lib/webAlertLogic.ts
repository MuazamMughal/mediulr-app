export interface AlertButtonLike {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: (...args: never[]) => void;
}

export function webAlertMessage(title: string, message?: string): string {
  return message ? `${title}\n\n${message}` : title;
}

/** Which button a browser OK / Cancel maps to: OK runs the first non-cancel button, Cancel runs the cancel button. */
export function pickWebAlertButton<T extends AlertButtonLike>(buttons: T[], confirmed: boolean): T | undefined {
  const cancel = buttons.find((b) => b.style === "cancel");
  const action = buttons.find((b) => b.style !== "cancel");
  return confirmed ? action : cancel;
}
