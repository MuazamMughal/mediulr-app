import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { toDateId, useCalendar, type CalendarDayMetadata } from "@marceloterreiro/flash-calendar";
import { useTheme } from "../theme/ThemeProvider";
import { addDays } from "../lib/dates";
import { AppText } from "./AppText";
import type { DayOverview } from "../features/calendar/overview";

interface MonthCalendarProps {
  /** The day whose timeline is shown below. */
  selected: Date;
  onSelect: (date: Date) => void;
  /** Which month the grid shows (any date inside it). */
  month: Date;
  onMonthChange: (date: Date) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  overview: Record<string, DayOverview> | undefined;
}

const DAY_HEIGHT = 50;

function describeDay(meta: CalendarDayMetadata, o: DayOverview | undefined): string {
  const parts = [meta.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })];
  if (o?.doses) parts.push(`${o.doses} ${o.doses === 1 ? "dose" : "doses"}, ${o.taken + o.skipped} done`);
  if (o?.visits) parts.push(`${o.visits} doctor ${o.visits === 1 ? "visit" : "visits"}`);
  if (o && !o.doses && !o.visits) parts.push("nothing scheduled");
  return parts.join(", ");
}

/**
 * The home screen's calendar. flash-calendar's `useCalendar` does the date maths (weeks, weekday labels,
 * month grid); each day is drawn here so it can carry dots for what's scheduled:
 *  - accent dot: medication doses (green once all are taken/skipped, amber if any were missed)
 *  - gold dot:   a doctor visit
 */
export function MonthCalendar({ selected, onSelect, month, onMonthChange, expanded, onToggleExpanded, overview }: MonthCalendarProps) {
  const theme = useTheme();
  const selectedId = toDateId(selected);

  const { weeksList, weekDaysList, calendarRowMonth } = useCalendar({
    calendarMonthId: toDateId(month),
    calendarFirstDayOfWeek: "monday",
    getCalendarWeekDayFormat: (date, locale) => date.toLocaleDateString(locale, { weekday: "narrow" }),
    calendarFormatLocale: undefined,
  });

  // Collapsed: only the week that contains the selected day (or the first week if it's off-grid).
  const weeks = expanded ? weeksList : [weeksList.find((w) => w.some((d) => d.id === selectedId)) ?? weeksList[0]];

  function step(direction: -1 | 1) {
    if (expanded) {
      onMonthChange(new Date(month.getFullYear(), month.getMonth() + direction, 1));
    } else {
      onSelect(addDays(selected, direction * 7));
    }
  }

  const showingToday = toDateId(selected) === toDateId(new Date());

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(20).stiffness(190)}
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        theme.shadow.sm,
      ]}
    >
      {/* Header: month, jump-to-today, navigation, collapse */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            const today = new Date();
            onMonthChange(today);
            onSelect(today);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${calendarRowMonth}. Jump to today`}
          style={{ flex: 1 }}
        >
          <AppText variant="h3">{calendarRowMonth}</AppText>
          {!showingToday && (
            <AppText variant="metadata" color="accent" weight="semibold">
              Back to today
            </AppText>
          )}
        </Pressable>
        <NavButton icon="chevron-back" label={expanded ? "Previous month" : "Previous week"} onPress={() => step(-1)} />
        <NavButton icon="chevron-forward" label={expanded ? "Next month" : "Next week"} onPress={() => step(1)} />
        <NavButton
          icon={expanded ? "chevron-up" : "chevron-down"}
          label={expanded ? "Show one week" : "Show full month"}
          onPress={onToggleExpanded}
        />
      </View>

      {/* Weekday letters */}
      <View style={styles.row}>
        {weekDaysList.map((label, i) => (
          <View key={`${label}-${i}`} style={styles.weekdayCell}>
            <AppText variant="metadata" color="tertiary" weight="semibold">
              {label}
            </AppText>
          </View>
        ))}
      </View>

      {/* Weeks */}
      {weeks.map((week) => (
        <Animated.View key={week[0].id} entering={FadeIn.duration(180)} style={styles.row}>
          {week.map((meta) => (
            <DayCell
              key={meta.id}
              meta={meta}
              overview={overview?.[meta.id]}
              isSelected={meta.id === selectedId}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                onSelect(meta.date);
                if (meta.isDifferentMonth) onMonthChange(meta.date);
              }}
            />
          ))}
        </Animated.View>
      ))}

      {expanded && (
        <View style={[styles.legend, { borderTopColor: theme.colors.border }]}>
          <LegendDot color={theme.colors.accent} label="Medication" />
          <LegendDot color={theme.colors.success} label="All done" />
          <LegendDot color={theme.colors.warning} label="Missed" />
          <LegendDot color={theme.colors.visit} label="Doctor visit" />
        </View>
      )}
    </Animated.View>
  );
}

function NavButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.navButton, { backgroundColor: theme.colors.surfaceSunken }, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

const DayCell = memo(function DayCell({
  meta,
  overview,
  isSelected,
  onPress,
}: {
  meta: CalendarDayMetadata;
  overview: DayOverview | undefined;
  isSelected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const doses = overview?.doses ?? 0;
  const visits = overview?.visits ?? 0;
  const allDone = doses > 0 && overview!.taken + overview!.skipped === doses;
  const doseColor = allDone ? theme.colors.success : (overview?.missed ?? 0) > 0 ? theme.colors.warning : theme.colors.accent;

  const numberColor = isSelected
    ? "inverse"
    : meta.isDifferentMonth
      ? "tertiary"
      : meta.isToday
        ? "accent"
        : "primary";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={describeDay(meta, overview)}
      accessibilityState={{ selected: isSelected }}
      style={styles.cell}
    >
      <View
        style={[
          styles.dayCircle,
          isSelected && { backgroundColor: theme.colors.accent },
          !isSelected && meta.isToday && { borderWidth: 1.5, borderColor: theme.colors.accent },
        ]}
      >
        <AppText
          variant="bodySmall"
          color={numberColor}
          weight={isSelected || meta.isToday ? "bold" : "medium"}
          style={meta.isDifferentMonth && !isSelected ? { opacity: 0.55 } : undefined}
        >
          {meta.displayLabel}
        </AppText>
      </View>
      <View style={styles.dots}>
        {doses > 0 && <View style={[styles.dot, { backgroundColor: doseColor }]} />}
        {visits > 0 && <View style={[styles.dot, { backgroundColor: theme.colors.visit }]} />}
      </View>
    </Pressable>
  );
});

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="metadata" color="tertiary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderCurve: "continuous",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 8,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, marginBottom: 10 },
  navButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row" },
  cell: { flex: 1, height: DAY_HEIGHT, alignItems: "center", justifyContent: "center" },
  weekdayCell: { flex: 1, height: 24, alignItems: "center", justifyContent: "center" },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dots: { flexDirection: "row", gap: 3, height: 6, marginTop: 1, alignItems: "center" },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
});
