import type { useRouter } from "expo-router";

/** A deep-linked form may have no underlying screen to dismiss to. */
export function dismissForm(router: ReturnType<typeof useRouter>) {
  if (router.canDismiss()) router.dismiss();
  else router.replace("/(tabs)");
}
