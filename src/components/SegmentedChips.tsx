import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

interface SegmentedChipsProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/** A pill-selector row — used for frequency selection and similar single-choice pickers. */
export function SegmentedChips({ options, selectedIndex, onSelect }: SegmentedChipsProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {options.map((label, i) => {
        const active = i === selectedIndex;
        return (
          <Pressable
            key={label}
            onPress={() => onSelect(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active ? theme.colors.accent : theme.colors.surfaceSunken,
                borderColor: active ? theme.colors.accent : theme.colors.border,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <AppText variant="bodySmall" weight="semibold" color={active ? "inverse" : "secondary"}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
  },
});
