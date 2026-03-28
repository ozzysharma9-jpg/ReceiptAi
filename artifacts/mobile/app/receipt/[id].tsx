import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useReceipts } from "@/context/ReceiptsContext";

const CATEGORY_ICONS: Record<string, string> = {
  Groceries: "basket",
  Dining: "restaurant",
  Transport: "car",
  Coffee: "cafe",
  Shopping: "bag",
  Healthcare: "medical",
  Entertainment: "film",
  Other: "receipt",
};

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { receipts, deleteReceipt } = useReceipts();

  const receipt = receipts.find((r) => r.id === id);
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  if (!receipt) {
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Receipt</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.center}>
          <Text style={[styles.notFound, { color: colors.textSecondary }]}>
            Receipt not found
          </Text>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert("Delete Receipt", "Are you sure you want to delete this receipt?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          await deleteReceipt(receipt.id);
          router.back();
        },
      },
    ]);
  };

  const categoryColor =
    colors.categories[receipt.category as keyof typeof colors.categories] ??
    colors.textSecondary;
  const iconName = CATEGORY_ICONS[receipt.category] ?? "receipt";

  const formattedDate = new Date(receipt.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Receipt</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.accentRed} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomInset + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {receipt.imageUri && (
          <Image
            source={{ uri: receipt.imageUri }}
            style={styles.receiptImage}
            resizeMode="cover"
          />
        )}

        {/* Amount hero */}
        <View
          style={[
            styles.amountCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
            Total Amount
          </Text>
          <Text style={[styles.amountValue, { color: colors.text }]}>
            ${receipt.amount.toFixed(2)}
          </Text>
        </View>

        {/* Details */}
        <View
          style={[
            styles.detailCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Merchant
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {receipt.merchant}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Date
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formattedDate}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Category
            </Text>
            <View style={styles.categoryBadge}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: categoryColor + "20" },
                ]}
              >
                <Ionicons
                  name={iconName as any}
                  size={14}
                  color={categoryColor}
                />
              </View>
              <Text
                style={[styles.categoryText, { color: categoryColor }]}
              >
                {receipt.category}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFound: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  receiptImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  amountCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  amountValue: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  detailCard: {
    borderRadius: 18,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    maxWidth: "60%",
    textAlign: "right",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
