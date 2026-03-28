import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReceiptCard } from "@/components/ReceiptCard";
import Colors from "@/constants/colors";
import { Receipt, useReceipts } from "@/context/ReceiptsContext";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ReceiptsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { receipts, deleteReceipt, loading } = useReceipts();
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const thisMonthReceipts = receipts.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = thisMonthReceipts.reduce((sum, r) => sum + r.amount, 0);

  const handleDelete = (receipt: Receipt) => {
    Alert.alert("Delete Receipt", `Remove receipt from ${receipt.merchant}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteReceipt(receipt.id),
      },
    ]);
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            paddingTop: topInset + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {MONTHS[now.getMonth()]} {now.getFullYear()}
          </Text>
          <Text style={[styles.monthTotal, { color: colors.text }]}>
            ${monthTotal.toFixed(2)}
            <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>
              {" "}this month
            </Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/scan")}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : receipts.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No receipts yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Scan your first receipt to start tracking
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/scan")}
            style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="scan" size={18} color="#FFF" />
            <Text style={styles.emptyBtnText}>Scan Receipt</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomInset + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(false)}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => (
            <ReceiptCard
              receipt={item}
              onPress={() =>
                router.push({
                  pathname: "/receipt/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
          ListHeaderComponent={
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              All Receipts
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  monthTotal: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  monthLabel: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  emptyBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
