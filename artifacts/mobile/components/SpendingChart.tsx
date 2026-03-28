import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import Colors from "@/constants/colors";
import { Category } from "@/context/ReceiptsContext";

interface BarData {
  label: string;
  value: number;
  color: string;
}

interface SpendingChartProps {
  data: BarData[];
  maxValue: number;
  title: string;
}

function AnimatedBar({
  item,
  maxValue,
}: {
  item: BarData;
  maxValue: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: maxValue > 0 ? item.value / maxValue : 0,
      damping: 20,
      stiffness: 120,
      useNativeDriver: false,
    }).start();
  }, [item.value, maxValue]);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];

  return (
    <View style={styles.barWrapper}>
      <Text style={[styles.barValue, { color: colors.text }]}>
        ${item.value.toFixed(0)}
      </Text>
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: item.color,
              flex: anim,
            },
          ]}
        />
      </View>
      <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {item.label}
      </Text>
    </View>
  );
}

export function SpendingChart({ data, maxValue, title }: SpendingChartProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No spending data yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.chart}>
        {data.map((item) => (
          <AnimatedBar key={item.label} item={item} maxValue={maxValue} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 16,
  },
  chart: {
    gap: 12,
  },
  barWrapper: {
    gap: 4,
  },
  barValue: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    flexDirection: "row",
    overflow: "hidden",
  },
  barFill: {
    borderRadius: 5,
  },
  barLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
