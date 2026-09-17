import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BudgetRing } from "@/components/BudgetRing";
import { SpendingChart } from "@/components/SpendingChart";
import Colors from "@/constants/colors";
import { useReceipts } from "@/context/ReceiptsContext";
import {
  categoryTotals,
  formatCurrency,
  getForecast,
  getRecurringTransactions,
  getWeekendEffect,
  monthReceipts,
  shiftMonth,
  totalFor,
} from "@/utils/spending";

const ALL_CATEGORIES = [
  "Groceries",
  "Dining",
  "Transport",
  "Coffee",
  "Shopping",
  "Healthcare",
  "Entertainment",
  "Other",
] as const;

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { receipts, goals, addGoal } = useReceipts();
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");

  const now = new Date();
  const currentMonth = useMemo(() => monthReceipts(receipts, now), [receipts]);
  const previousMonth = useMemo(() => monthReceipts(receipts, shiftMonth(now, -1)), [receipts]);
  const total = totalFor(currentMonth);
  const previousTotal = totalFor(previousMonth);
  const forecast = getForecast(receipts, now);
  const weekendEffect = getWeekendEffect(receipts);
  const recurring = getRecurringTransactions(receipts);
  const recurringTotal = recurring.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const currentCategories = categoryTotals(currentMonth);
  const previousCategories = categoryTotals(previousMonth);

  const chartData = ALL_CATEGORIES
    .filter((category) => (currentCategories[category] ?? 0) > 0)
    .sort((a, b) => (currentCategories[b] ?? 0) - (currentCategories[a] ?? 0))
    .map((category) => ({
      label: category,
      value: currentCategories[category] ?? 0,
      color: colors.categories[category],
    }));
  const segments = chartData.map((item) => ({
    category: item.label,
    amount: item.value,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
    color: item.color,
  }));
  const maxValue = chartData.length ? Math.max(...chartData.map((item) => item.value)) : 1;
  const biggestChange = Object.entries(currentCategories)
    .map(([category, amount]) => ({
      category,
      amount,
      previous: previousCategories[category] ?? 0,
      change:
        (previousCategories[category] ?? 0) > 0
          ? ((amount - (previousCategories[category] ?? 0)) / (previousCategories[category] ?? 0)) * 100
          : amount > 0
            ? 100
            : 0,
    }))
    .sort((a, b) => b.change - a.change)[0];

  const saveGoal = async () => {
    const targetAmount = Number(goalTarget.replace(/,/g, ""));
    if (!goalTitle.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) return;
    await addGoal({ title: goalTitle.trim(), targetAmount, savedAmount: 0 });
    setGoalTitle("");
    setGoalTarget("");
    setGoalModalVisible(false);
  };

  const topPattern =
    biggestChange && biggestChange.change > 10
      ? `${biggestChange.category} spending is up ${Math.round(biggestChange.change)}% compared with last month.`
      : weekendEffect.percentage > 10
        ? `You spend ${weekendEffect.percentage}% more per transaction on weekends.`
        : "Your spending is steady. Keep scanning receipts to reveal more patterns.";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Insights</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Your money, explained</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <Metric label="This month" value={formatCurrency(total)} colors={colors} />
          <Metric label="Forecast" value={formatCurrency(forecast.expectedMonthEnd)} colors={colors} />
          <Metric label="Receipts" value={`${currentMonth.length}`} colors={colors} />
        </View>

        <View style={[styles.forecastCard, { backgroundColor: colors.primary }]}>
          <View style={styles.forecastHeader}>
            <View style={styles.forecastHeading}>
              <View style={styles.iconBadge}><Ionicons name="sparkles" size={16} color={colors.accent} /></View>
              <Text style={styles.forecastEyebrow}>FUTURE WALLET</Text>
            </View>
            <Ionicons name={forecast.overBudgetBy ? "warning-outline" : "trending-up"} size={24} color={forecast.overBudgetBy ? colors.accentRed : colors.accentGreen} />
          </View>
          <Text style={styles.forecastTitle}>
            {forecast.overBudgetBy ? `You may exceed your budget by ${formatCurrency(forecast.overBudgetBy)}.` : "You are on track this month."}
          </Text>
          <Text style={styles.forecastBody}>
            At your current daily rate, you are expected to spend {formatCurrency(forecast.expectedMonthEnd)} by month-end.
          </Text>
          <View style={styles.whiteTrack}><View style={[styles.whiteFill, { width: `${forecast.progress * 100}%`, backgroundColor: forecast.overBudgetBy ? colors.accentRed : colors.accentGreen }]} /></View>
          <Text style={styles.forecastFoot}>{formatCurrency(Math.max(forecast.remainingBudget, 0))} remaining from a {formatCurrency(25000)} plan</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal patterns</Text>
          <Ionicons name="analytics-outline" size={19} color={colors.accent} />
        </View>
        <View style={[styles.patternCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.patternIcon, { backgroundColor: colors.accent + "18" }]}><Ionicons name="bulb-outline" size={20} color={colors.accent} /></View>
          <View style={styles.patternCopy}>
            <Text style={[styles.patternTitle, { color: colors.text }]}>
              {biggestChange && biggestChange.change > 10 ? "Category spike" : weekendEffect.percentage > 10 ? "Weekend effect" : "Spending pulse"}
            </Text>
            <Text style={[styles.patternText, { color: colors.textSecondary }]}>{topPattern}</Text>
          </View>
        </View>
        <View style={styles.patternRow}>
          <MiniPattern icon="calendar-outline" title="Weekend spend" value={`${Math.max(weekendEffect.percentage, 0)}%`} caption="vs weekdays" colors={colors} />
          <MiniPattern icon="repeat-outline" title="Recurring" value={formatCurrency(recurringTotal)} caption={`${recurring.length} detected`} colors={colors} />
        </View>

        {segments.length > 0 && <BudgetRing segments={segments} total={total} />}
        <SpendingChart data={chartData} maxValue={maxValue} title="Top categories" />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recurring payments</Text>
          <Ionicons name="repeat" size={19} color={colors.accent} />
        </View>
        <View style={[styles.subscriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {recurring.length > 0 ? recurring.slice(0, 4).map((item) => (
            <View key={item.key} style={[styles.subscriptionRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.subscriptionIcon, { backgroundColor: colors.accentGreen + "18" }]}><Ionicons name="refresh-outline" size={17} color={colors.accentGreen} /></View>
              <View style={styles.subscriptionCopy}><Text style={[styles.subscriptionName, { color: colors.text }]}>{item.merchant}</Text><Text style={[styles.subscriptionMeta, { color: colors.textSecondary }]}>{item.count} matching transactions</Text></View>
              <Text style={[styles.subscriptionAmount, { color: colors.text }]}>{formatCurrency(item.monthlyAmount)}<Text style={styles.perMonth}>/mo</Text></Text>
            </View>
          )) : (
            <View style={styles.emptyInline}><Ionicons name="repeat-outline" size={24} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Repeated merchants will appear here as subscriptions.</Text></View>
          )}
          {recurring.length > 0 && <Text style={[styles.totalRecurring, { color: colors.textSecondary }]}>Estimated recurring total <Text style={{ color: colors.text, fontFamily: "Inter_700Bold" }}>{formatCurrency(recurringTotal)}/month</Text></Text>}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial goals</Text>
          <TouchableOpacity onPress={() => setGoalModalVisible(true)} style={[styles.addGoal, { backgroundColor: colors.accent + "18" }]}>
            <Ionicons name="add" size={16} color={colors.accent} /><Text style={[styles.addGoalText, { color: colors.accent }]}>Add goal</Text>
          </TouchableOpacity>
        </View>
        {goals.length > 0 ? goals.map((goal) => (
          <View key={goal.id} style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.goalTop}><View><Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text><Text style={[styles.goalMeta, { color: colors.textSecondary }]}>{formatCurrency(goal.savedAmount)} of {formatCurrency(goal.targetAmount)}</Text></View><Text style={[styles.goalPercent, { color: colors.accent }]}>{Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100)}%</Text></View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { width: `${Math.min((goal.savedAmount / goal.targetAmount) * 100, 100)}%`, backgroundColor: colors.accent }]} /></View>
          </View>
        )) : (
          <TouchableOpacity onPress={() => setGoalModalVisible(true)} style={[styles.emptyGoal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.goalIcon, { backgroundColor: colors.accent + "18" }]}><Ionicons name="flag-outline" size={22} color={colors.accent} /></View>
            <View style={styles.goalCopy}><Text style={[styles.goalTitle, { color: colors.text }]}>Give your savings a destination</Text><Text style={[styles.goalMeta, { color: colors.textSecondary }]}>Create a goal and track your progress.</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={goalModalVisible} transparent animationType="slide" onRequestClose={() => setGoalModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.text }]}>Create a goal</Text><TouchableOpacity onPress={() => setGoalModalVisible(false)}><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity></View>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Goal name</Text>
            <TextInput value={goalTitle} onChangeText={setGoalTitle} placeholder="MacBook fund" placeholderTextColor={colors.textMuted} style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]} />
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target amount</Text>
            <TextInput value={goalTarget} onChangeText={setGoalTarget} placeholder="100000" placeholderTextColor={colors.textMuted} keyboardType="numeric" style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]} />
            <TouchableOpacity onPress={saveGoal} style={[styles.saveGoal, { backgroundColor: colors.accent }]}><Text style={styles.saveGoalText}>Create goal</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Metric({ label, value, colors }: { label: string; value: string; colors: typeof Colors.light }) {
  return <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text></View>;
}

function MiniPattern({ icon, title, value, caption, colors }: { icon: any; title: string; value: string; caption: string; colors: typeof Colors.light }) {
  return <View style={[styles.miniPattern, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name={icon} size={18} color={colors.accent} /><Text style={[styles.miniTitle, { color: colors.textSecondary }]}>{title}</Text><Text style={[styles.miniValue, { color: colors.text }]}>{value}</Text><Text style={[styles.miniCaption, { color: colors.textMuted }]}>{caption}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  content: { padding: 16, gap: 16 },
  summaryRow: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, borderRadius: 14, padding: 13, borderWidth: StyleSheet.hairlineWidth, gap: 5 },
  metricLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  metricValue: { fontSize: 17, fontFamily: "Inter_700Bold" },
  forecastCard: { borderRadius: 22, padding: 20, gap: 12 },
  forecastHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  forecastHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBadge: { width: 28, height: 28, borderRadius: 9, backgroundColor: "rgba(0,212,255,0.14)", alignItems: "center", justifyContent: "center" },
  forecastEyebrow: { color: "#AFC1D2", fontSize: 11, letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  forecastTitle: { color: "#FFFFFF", fontSize: 22, lineHeight: 28, fontFamily: "Inter_700Bold" },
  forecastBody: { color: "#B9C9D8", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  whiteTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden", marginTop: 4 },
  whiteFill: { height: "100%", borderRadius: 4 },
  forecastFoot: { color: "#B9C9D8", fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  patternCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth },
  patternIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  patternCopy: { flex: 1, gap: 4 },
  patternTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  patternText: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
  patternRow: { flexDirection: "row", gap: 10 },
  miniPattern: { flex: 1, borderRadius: 15, padding: 13, borderWidth: StyleSheet.hairlineWidth, gap: 5 },
  miniTitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  miniValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  miniCaption: { fontSize: 11, fontFamily: "Inter_400Regular" },
  subscriptionCard: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  subscriptionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  subscriptionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  subscriptionCopy: { flex: 1, gap: 3 },
  subscriptionName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  subscriptionMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  subscriptionAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  perMonth: { fontSize: 10, fontFamily: "Inter_400Regular" },
  totalRecurring: { paddingVertical: 14, fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyInline: { paddingVertical: 22, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, lineHeight: 18, textAlign: "center", fontFamily: "Inter_400Regular" },
  addGoal: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 },
  addGoalText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  goalCard: { borderRadius: 17, padding: 16, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  goalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  goalMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  goalPercent: { fontSize: 19, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  emptyGoal: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth },
  goalIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  goalCopy: { flex: 1 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 9 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  modalTitle: { fontSize: 21, fontFamily: "Inter_700Bold" },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 6 },
  modalInput: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveGoal: { alignItems: "center", justifyContent: "center", borderRadius: 13, paddingVertical: 15, marginTop: 8 },
  saveGoalText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});