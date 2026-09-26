import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AppText } from "../../src/components/AppText";
import { AppButton } from "../../src/components/AppButton";
import { EmptyState } from "../../src/components/EmptyState";
import { SegmentedChips } from "../../src/components/SegmentedChips";
import { DayNavigator } from "../../src/components/DayNavigator";
import { PeriodHeader, periodOf, type Period } from "../../src/components/PeriodHeader";
import { SkeletonRow } from "../../src/components/Skeleton";
import { TimelineItem } from "../../src/components/TimelineItem";
import { endOfLocalDay, startOfLocalDay, toLocalDateString } from "../../src/lib/dates";
import { isSameDay } from "../../src/lib/dayTime";
import { useActiveProfile } from "../../src/features/profile/ActiveProfile";
import { useI18n } from "../../src/i18n/LocaleProvider";
import { useFoodForRange } from "../../src/features/nutrition/useFood";
import { useExerciseForRange } from "../../src/features/exercise/useExercise";
import { formatDuration, totalMinutes } from "../../src/features/exercise/logic";
import type { CalendarEvent } from "../../src/types/domain";

type Section = "food" | "exercise";
const SECTION_KEYS: Section[] = ["food", "exercise"];

type Row = { key: string; kind: "period"; period: Period } | { key: string; kind: "event"; event: CalendarEvent };

const EMPTY_ICON = { food: "restaurant-outline", exercise: "walk-outline" } as const;

/** The Food / Exercise tab: one day at a time, easy to step back through. Both live here so the tab bar stays four-plus-one. */
export default function LifestyleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const i18n = useI18n();
  const { t } = i18n;
  const { profile, isViewingSelf } = useActiveProfile();
  const [section, setSection] = useState<Section>("food");
  const [day, setDay] = useState(() => new Date());

  const rangeStart = useMemo(() => startOfLocalDay(day), [day]);
  const rangeEnd = useMemo(() => endOfLocalDay(day), [day]);
  const food = useFoodForRange(profile?.id, rangeStart, rangeEnd);
  const exercise = useExerciseForRange(profile?.id, rangeStart, rangeEnd);
  const active = section === "food" ? food : exercise;
  const copy = {
    add: t(`lifestyle.${section}.add` as "lifestyle.food.add"),
    emptyIcon: EMPTY_ICON[section],
    todayTitle: t(`lifestyle.${section}.todayTitle` as "lifestyle.food.todayTitle"),
    todayText: t(`lifestyle.${section}.todayText` as "lifestyle.food.todayText"),
    todayAction: t(`lifestyle.${section}.todayAction` as "lifestyle.food.todayAction"),
    pastTitle: t(`lifestyle.${section}.pastTitle` as "lifestyle.food.pastTitle"),
    pastText: t(`lifestyle.${section}.pastText` as "lifestyle.food.pastText"),
    pastAction: t(`lifestyle.${section}.pastAction` as "lifestyle.food.pastAction"),
    errorTitle: t(`lifestyle.${section}.errorTitle` as "lifestyle.food.errorTitle"),
  };
  const isToday = isSameDay(day, new Date());

  const events = useMemo<CalendarEvent[]>(() => {
    if (section === "food") return (food.data ?? []).map((f) => ({ kind: "food" as const, at: f.eatenAt, food: f }));
    return (exercise.data ?? []).map((e) => ({ kind: "exercise" as const, at: e.startedAt, exercise: e }));
  }, [section, food.data, exercise.data]);

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = [];
    let last: Period | null = null;
    for (const [i, event] of events.entries()) {
      const period = periodOf(new Date(event.at));
      if (period !== last) {
        result.push({ key: `period-${period}`, kind: "period", period });
        last = period;
      }
      result.push({ key: `${event.kind}-${i}-${event.at}`, kind: "event", event });
    }
    return result;
  }, [events]);

  const summary =
    section === "food"
      ? events.length > 0
        ? i18n.tn("lifestyle.meals", events.length)
        : null
      : exercise.data && exercise.data.length > 0
        ? `${formatDuration(totalMinutes(exercise.data), i18n)} · ${i18n.tn("lifestyle.activities", exercise.data.length)}`
        : null;

  function openEntry(event: CalendarEvent) {
    if (event.kind === "food") router.push(`/food/${event.food.id}`);
    else if (event.kind === "exercise") router.push(`/exercise/${event.exercise.id}`);
  }

  const isLoading = !profile || active.isLoading;
  const addRoute = `/${section}/new?date=${toLocalDateString(day)}` as const;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <AppText variant="h1">{t("lifestyle.title")}</AppText>
        {!isViewingSelf && profile && (
          <AppText variant="bodySmall" color="secondary" style={{ marginTop: 2 }}>
            {t("common.forName", { name: profile.displayName })}
          </AppText>
        )}
      </View>

      <View style={styles.switcher}>
        <SegmentedChips
          options={SECTION_KEYS.map((k) => t(`lifestyle.section.${k}` as "lifestyle.section.food"))}
          selectedIndex={SECTION_KEYS.indexOf(section)}
          onSelect={(i) => setSection(SECTION_KEYS[i])}
        />
      </View>

      <DayNavigator day={day} onChange={setDay} />
      <View style={styles.summary}>
        <AppText variant="caption" color={summary ? "secondary" : "tertiary"}>
          {isLoading ? t("common.loading") : (summary ?? " ")}
        </AppText>
      </View>

      {isLoading && (
        <View>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      )}

      {!isLoading && active.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title={copy.errorTitle}
          description={t("common.checkConnection")}
          actionLabel={t("common.tryAgain")}
          onAction={() => active.refetch()}
        />
      )}

      {!isLoading && !active.isError && rows.length === 0 && (
        <Animated.View key={`${section}-empty-${toLocalDateString(day)}`} entering={FadeIn.duration(220)}>
          <EmptyState
            icon={copy.emptyIcon}
            title={isToday ? copy.todayTitle : copy.pastTitle}
            description={isToday ? copy.todayText : copy.pastText}
            actionLabel={isToday ? copy.todayAction : copy.pastAction}
            onAction={() => router.push(addRoute)}
          />
        </Animated.View>
      )}

      {!isLoading && !active.isError && rows.length > 0 && (
        <>
          <Animated.View key={`${section}-${toLocalDateString(day)}`} entering={FadeIn.duration(220)} style={{ flex: 1 }}>
            <FlatList
              data={rows}
              keyExtractor={(r) => r.key}
              renderItem={({ item }) =>
                item.kind === "period" ? (
                  <PeriodHeader period={item.period} />
                ) : (
                  <TimelineItem
                    event={item.event}
                    onPress={() => openEntry(item.event)}
                  />
                )
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <AppButton label={copy.add} size="md" onPress={() => router.push(addRoute)} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  switcher: { paddingHorizontal: 20, paddingBottom: 16 },
  summary: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, minHeight: 25 },
  listContent: { paddingBottom: 12 },
  footer: { padding: 16, borderTopWidth: 1 },
});
