import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BudgetRing } from "@/components/BudgetRing";
import { SpendingChart } from "@/components/SpendingChart";
import Colors from "@/constants/colors";
import { Category, useReceipts } from "@/context/ReceiptsContext";

const ALL_CATEGORIES: Category[] = [
  "Groceries",
  "Dining",
  "Transport",
  "Coffee",
  "Shopping",
  "Healthcare",
  "Entertainment",
  "Other",
];

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { receipts } = useReceipts();

  const now = new Date();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const thisMonth = useMemo(() =>
    receipts.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }),
    [receipts]
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of thisMonth) {
      map[r.category] = (map[r.category] ?? 0) + r.amount;
    }
    return map;
  }, [thisMonth]);

  const total = useMemo(() =>
    Object.values(byCategory).reduce((s, v) => s + v, 0),
    [byCategory]
  );

  const chartData = useMemo(() =>
    ALL_CATEGORIES
      .filter((cat) => (byCategory[cat] ?? 0) > 0)
      .sort((a, b) => (byCategory[b] ?? 0) - (byCategory[a] ?? 0))
      .map((cat) => ({
        label: cat,
        value: byCategory[cat] ?? 0,
        color: colors.categories[cat],
      })),
    [byCategory, colors]
  );

  const segments = useMemo(() =>
    chartData.map((d) => ({
      category: d.label as Category,
      amount: d.value,
      percentage: total > 0 ? (d.value / total) * 100 : 0,
      color: d.color,
    })),
    [chartData, total]
  );

  const maxValue = useMemo(() =>
    chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) : 1,
    [chartData]
  );

  const avgPerDay = useMemo(() => {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return total / daysInMonth;
  }, [total]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topInset + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Insights</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
          {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Total Spent
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ${total.toFixed(2)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Per Day (avg)
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ${avgPerDay.toFixed(2)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Receipts
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {thisMonth.length}
            </Text>
          </View>
        </View>

        {segments.length > 0 && (
          <BudgetRing segments={segments} total={total} />
        )}

        <SpendingChart
          data={chartData}
          maxValue={maxValue}
          title="Spending by Category"
        />

        {receipts.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No data yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Scan receipts to see spending insights
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  emptyState: {
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
