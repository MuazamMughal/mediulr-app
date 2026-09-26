import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { toDateId, useCalendar, type CalendarDayMetadata } from "@marceloterreiro/flash-calendar";
import { useTheme } from "../theme/ThemeProvider";
import { addDays } from "../lib/dates";
import { AppText } from "./AppText";
import { useI18n } from "../i18n/LocaleProvider";
import type { I18n } from "../i18n";
import type { DayOverview } from "../features/calendar/overview";
import type { DayLogs } from "../features/lifestyle/logic";

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
  /** Meals and activity per day; shown as hollow markers so they read as quieter than doses and visits. */
  logs?: Record<string, DayLogs>;
}

const DAY_HEIGHT = 50;

function describeDay(meta: CalendarDayMetadata, o: DayOverview | undefined, l: DayLogs | undefined, { t, tn, fmt, locale }: I18n): string {
  const parts = [fmt.dayFull(meta.date)];
  if (o?.doses) parts.push(tn("calendar.day.doses", o.doses, { done: o.taken + o.skipped }));
  if (o?.visits) parts.push(tn("calendar.day.visits", o.visits));
  if (l?.meals) parts.push(tn("calendar.day.meals", l.meals));
  if (l?.activities) parts.push(tn("calendar.day.activities", l.activities));
  if (l?.reminders) parts.push(tn("reminders.a11yCount", l.reminders));
  if (o && !o.doses && !o.visits && !l?.meals && !l?.activities && !l?.reminders) parts.push(t("calendar.day.nothing"));
  return parts.join(locale === "ur" ? "، " : ", ");
}

/**
 * The home screen's calendar. flash-calendar's `useCalendar` does the date maths (weeks, weekday labels,
 * month grid); each day is drawn here so it can carry dots for what's scheduled:
 *  - accent dot: medication doses (green once all are taken/skipped, amber if any were missed)
 *  - gold dot:   a doctor visit
 *  - hollow green / grey ring: meals / exercise logged
 */
export function MonthCalendar({ selected, onSelect, month, onMonthChange, expanded, onToggleExpanded, overview, logs }: MonthCalendarProps) {
  const theme = useTheme();
  const { t, fmt, isRTL } = useI18n();
  const selectedId = toDateId(selected);

  const { weeksList } = useCalendar({
    calendarMonthId: toDateId(month),
    calendarFirstDayOfWeek: "monday",
  });
  const calendarRowMonth = fmt.monthYear(month);

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
          accessibilityLabel={t("calendar.jumpToToday", { month: calendarRowMonth })}
          style={{ flex: 1 }}
        >
          <AppText variant="h3">{calendarRowMonth}</AppText>
          {!showingToday && (
            <AppText variant="metadata" color="accent" weight="semibold">
              {t("common.backToToday")}
            </AppText>
          )}
        </Pressable>
        <NavButton icon={isRTL ? "chevron-forward" : "chevron-back"} label={expanded ? t("picker.previousMonth") : t("picker.previousWeek")} onPress={() => step(-1)} />
        <NavButton icon={isRTL ? "chevron-back" : "chevron-forward"} label={expanded ? t("picker.nextMonth") : t("picker.nextWeek")} onPress={() => step(1)} />
        <NavButton
          icon={expanded ? "chevron-up" : "chevron-down"}
          label={expanded ? t("calendar.showOneWeek") : t("calendar.showFullMonth")}
          onPress={onToggleExpanded}
        />
      </View>

      {/* Weekday letters */}
      <View style={styles.row}>
        {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => (
          <View key={dayIndex} style={styles.weekdayCell}>
            <AppText variant="metadata" color="tertiary" weight="semibold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {fmt.weekdayName(dayIndex, "narrow")}
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
              logs={logs?.[meta.id]}
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
          <LegendDot color={theme.colors.accent} label={t("calendar.legend.medication")} />
          <LegendDot color={theme.colors.success} label={t("calendar.legend.allDone")} />
          <LegendDot color={theme.colors.warning} label={t("calendar.legend.missed")} />
          <LegendDot color={theme.colors.visit} label={t("calendar.legend.visit")} />
          <LegendDot color={theme.colors.nutrition} label={t("calendar.legend.food")} hollow />
          <LegendDot color={theme.colors.exercise} label={t("calendar.legend.exercise")} hollow />
          <LegendDot color={theme.colors.reminder} label={t("reminders.legend")} hollow />
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
  logs,
  isSelected,
  onPress,
}: {
  meta: CalendarDayMetadata;
  overview: DayOverview | undefined;
  logs: DayLogs | undefined;
  isSelected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const i18n = useI18n();
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
      accessibilityLabel={describeDay(meta, overview, logs, i18n)}
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
        {(logs?.meals ?? 0) > 0 && <View style={[styles.dot, styles.ring, { borderColor: theme.colors.nutrition }]} />}
        {(logs?.activities ?? 0) > 0 && <View style={[styles.dot, styles.ring, { borderColor: theme.colors.exercise }]} />}
        {(logs?.reminders ?? 0) > 0 && <View style={[styles.dot, styles.ring, { borderColor: theme.colors.reminder }]} />}
      </View>
    </Pressable>
  );
});

function LegendDot({ color, label, hollow }: { color: string; label: string; hollow?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, hollow ? [styles.ring, { borderColor: color }] : { backgroundColor: color }]} />
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
  ring: { borderWidth: 1.25, backgroundColor: "transparent" },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 14,
    rowGap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
});
