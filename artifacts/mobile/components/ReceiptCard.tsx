import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Category, Receipt } from "@/context/ReceiptsContext";
import Colors from "@/constants/colors";

const CATEGORY_ICONS: Record<Category, string> = {
  Groceries: "basket",
  Dining: "restaurant",
  Transport: "car",
  Coffee: "cafe",
  Shopping: "bag",
  Healthcare: "medical",
  Entertainment: "film",
  Other: "receipt",
};

interface ReceiptCardProps {
  receipt: Receipt;
  onPress: () => void;
}

export function ReceiptCard({ receipt, onPress }: ReceiptCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    }, 100);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const date = new Date(receipt.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const categoryColor =
    colors.categories[receipt.category] ?? colors.textSecondary;
  const iconName = CATEGORY_ICONS[receipt.category] ?? "receipt";

  return (
    <Animated.View style={[animStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            shadowColor: colors.shadow,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: categoryColor + "20" },
          ]}
        >
          <Ionicons
            name={iconName as any}
            size={22}
            color={categoryColor}
          />
        </View>
        <View style={styles.info}>
          <Text
            style={[styles.merchant, { color: colors.text }]}
            numberOfLines={1}
          >
            {receipt.merchant}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {formattedDate} · {receipt.category}
          </Text>
        </View>
        <Text style={[styles.amount, { color: colors.text }]}>
          ${receipt.amount.toFixed(2)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  merchant: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  amount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginLeft: 8,
  },
});
