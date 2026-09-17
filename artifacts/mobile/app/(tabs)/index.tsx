import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReceiptCard } from "@/components/ReceiptCard";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useReceipts } from "@/context/ReceiptsContext";
import {
  categoryTotals,
  formatCurrency,
  getDailyTotals,
  getForecast,
  isSameMonth,
  monthReceipts,
  shiftMonth,
  topCategory,
  totalFor,
} from "@/utils/spending";

export default function ReceiptsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { receipts, loading } = useReceipts();
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const currentMonth = useMemo(() => monthReceipts(receipts, now), [receipts]);
  const previousMonth = useMemo(
    () => monthReceipts(receipts, shiftMonth(now, -1)),
    [receipts],
  );
  const monthTotal = totalFor(currentMonth);
  const previousTotal = totalFor(previousMonth);
  const change =
    previousTotal > 0 ? Math.round(((monthTotal - previousTotal) / previousTotal) * 100) : 0;
  const forecast = getForecast(receipts, now);
  const top = topCategory(currentMonth);
  const dailyTotals = getDailyTotals(receipts, now);
  const categoryList = Object.entries(categoryTotals(currentMonth))
    .sort(([, amountA], [, amountB]) => amountB - amountA)
    .slice(0, 3);
  const firstName = user?.name?.split(/[\s@]/)[0] || "there";
  const topDaily = Math.max(...dailyTotals.map((item) => item.amount), 1);

  const topInsight = top
    ? `${top[0]} is your biggest category at ${formatCurrency(top[1])} this month.`
    : "Scan a receipt and your first spending insight will appear here.";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(false)}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
              {now.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            <Text style={[styles.greeting, { color: colors.text }]}>
              Good morning, {firstName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/scan")}
            style={[styles.addButton, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            <View style={[styles.pulseCard, { backgroundColor: colors.primary }]}>
              <View style={styles.pulseHeader}>
                <View>
                  <Text style={styles.pulseLabel}>Your financial pulse</Text>
                  <Text style={styles.pulseValue}>{formatCurrency(monthTotal)}</Text>
                  <Text style={styles.pulseSub}>spent this month</Text>
                </View>
                <View style={styles.pulseIcon}>
                  <Ionicons name="pulse" size={22} color={colors.accent} />
                </View>
              </View>
              <View style={styles.pulseFooter}>
                <Text style={styles.pulseChange}>
                  {previousTotal > 0
                    ? `${change <= 0 ? "↓" : "↑"} ${Math.abs(change)}% vs last month`
                    : "Your first month of insights"}
                </Text>
                <Text style={styles.pulseBudget}>
                  {formatCurrency(Math.max(forecast.remainingBudget, 0))} budget left
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/assistant")}
              style={[styles.copilotCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.copilotIcon, { backgroundColor: colors.accent + "20" }]}>
                <Ionicons name="sparkles" size={20} color={colors.accent} />
              </View>
              <View style={styles.copilotCopy}>
                <Text style={[styles.copilotTitle, { color: colors.text }]}>AI Spending Copilot</Text>
                <Text style={[styles.copilotText, { color: colors.textSecondary }]}>{topInsight}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Future Wallet</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/insights")}>
                <Text style={[styles.seeAll, { color: colors.accent }]}>View insights</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.forecastCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.forecastTop}>
                <View>
                  <Text style={[styles.forecastLabel, { color: colors.textSecondary }]}>Expected month-end</Text>
                  <Text style={[styles.forecastValue, { color: colors.text }]}>
                    {formatCurrency(forecast.expectedMonthEnd)}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: forecast.overBudgetBy ? colors.accentRed + "18" : colors.accentGreen + "18" }]}>
                  <Ionicons
                    name={forecast.overBudgetBy ? "warning-outline" : "checkmark-circle-outline"}
                    size={14}
                    color={forecast.overBudgetBy ? colors.accentRed : colors.accentGreen}
                  />
                  <Text style={[styles.statusText, { color: forecast.overBudgetBy ? colors.accentRed : colors.accentGreen }]}>
                    {forecast.overBudgetBy ? "Over budget" : "On track"}
                  </Text>
                </View>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${forecast.progress * 100}%`, backgroundColor: forecast.overBudgetBy ? colors.accentRed : colors.accent }]} />
              </View>
              <Text style={[styles.forecastHint, { color: colors.textSecondary }]}>
                {forecast.overBudgetBy
                  ? `At this rate, you may exceed your budget by ${formatCurrency(forecast.overBudgetBy)}.`
                  : `${formatCurrency(Math.max(forecast.remainingBudget, 0))} remains from your ${formatCurrency(25000)} monthly plan.`}
              </Text>
            </View>

            {dailyTotals.length > 0 && (
              <View style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending timeline</Text>
                <View style={styles.timeline}>
                  {dailyTotals.slice(-7).map((item) => (
                    <View key={item.day} style={styles.dayColumn}>
                      <View style={[styles.dayTrack, { backgroundColor: colors.surfaceSecondary }]}>
                        <View style={[styles.dayBar, { height: `${Math.max((item.amount / topDaily) * 100, 8)}%`, backgroundColor: colors.accent }]} />
                      </View>
                      <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{item.day}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Top categories</Text>
              <Text style={[styles.seeAll, { color: colors.textMuted }]}>{currentMonth.length} receipts</Text>
            </View>
            <View style={styles.categoryRow}>
              {categoryList.length > 0 ? categoryList.map(([category, amount], index) => (
                <View key={category} style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.categoryDot, { backgroundColor: [colors.accent, colors.accentGreen, "#FF8A65"][index] }]} />
                  <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>{category}</Text>
                  <Text style={[styles.categoryAmount, { color: colors.textSecondary }]}>{formatCurrency(amount)}</Text>
                </View>
              )) : (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Scan receipts to unlock category insights.</Text>
              )}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent receipts</Text>
              <TouchableOpacity onPress={() => router.push("/scan")}>
                <Text style={[styles.seeAll, { color: colors.accent }]}>Scan receipt</Text>
              </TouchableOpacity>
            </View>
            {receipts.length > 0 ? receipts.slice(0, 4).map((receipt) => (
              <ReceiptCard
                key={receipt.id}
                receipt={receipt}
                onPress={() => router.push({ pathname: "/receipt/[id]", params: { id: receipt.id } })}
              />
            )) : (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="scan-outline" size={28} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Start your money story</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Scan a receipt to create your first personalized insight.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontSize: 12, fontFamily: "Inter_400Regular" },
  greeting: { fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 3 },
  addButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pulseCard: { borderRadius: 22, padding: 20, gap: 22 },
  pulseHeader: { flexDirection: "row", justifyContent: "space-between" },
  pulseLabel: { color: "#B9C9D8", fontSize: 13, fontFamily: "Inter_500Medium" },
  pulseValue: { color: "#FFFFFF", fontSize: 34, fontFamily: "Inter_700Bold", marginTop: 6 },
  pulseSub: { color: "#B9C9D8", fontSize: 13, fontFamily: "Inter_400Regular" },
  pulseIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(0,212,255,0.15)", alignItems: "center", justifyContent: "center" },
  pulseFooter: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  pulseChange: { color: "#8BEAD0", fontSize: 12, fontFamily: "Inter_500Medium" },
  pulseBudget: { color: "#B9C9D8", fontSize: 12, fontFamily: "Inter_400Regular" },
  copilotCard: { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 14, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  copilotIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  copilotCopy: { flex: 1, gap: 3 },
  copilotTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  copilotText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 12, fontFamily: "Inter_500Medium" },
  forecastCard: { borderRadius: 18, padding: 16, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  forecastTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  forecastLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  forecastValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  forecastHint: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  timelineCard: { borderRadius: 18, padding: 16, borderWidth: StyleSheet.hairlineWidth, gap: 14 },
  timeline: { height: 100, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", gap: 8 },
  dayColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 5 },
  dayTrack: { width: "100%", height: 76, borderRadius: 7, justifyContent: "flex-end", overflow: "hidden" },
  dayBar: { width: "100%", borderRadius: 7 },
  dayLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  categoryRow: { flexDirection: "row", gap: 10 },
  categoryCard: { flex: 1, minWidth: 0, borderRadius: 14, padding: 12, borderWidth: StyleSheet.hairlineWidth, gap: 7 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  categoryAmount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyState: { borderRadius: 18, padding: 24, alignItems: "center", borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 13, lineHeight: 18, textAlign: "center", fontFamily: "Inter_400Regular" },
});