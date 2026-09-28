import { Platform, Switch, View, type SwitchProps } from "react-native";

/** Keep the web switch's logical thumb offsets consistent within RTL screens. */
export function AppSwitch(props: SwitchProps) {
  if (Platform.OS !== "web") return <Switch {...props} />;
  return <View {...{ dir: "ltr" }}><Switch {...props} /></View>;
}
