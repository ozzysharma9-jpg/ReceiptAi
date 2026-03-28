import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import Svg, { Circle } from "react-native-svg";

import Colors from "@/constants/colors";
import { Category } from "@/context/ReceiptsContext";

interface Segment {
  category: Category;
  amount: number;
  percentage: number;
  color: string;
}

interface BudgetRingProps {
  segments: Segment[];
  total: number;
}

const SIZE = 160;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function BudgetRing({ segments, total }: BudgetRingProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];

  let offset = 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Budget Distribution</Text>
      <View style={styles.row}>
        <View style={styles.svgWrapper}>
          <Svg width={SIZE} height={SIZE}>
            {/* Background circle */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={colors.border}
              strokeWidth={STROKE}
            />
            {segments.map((seg, i) => {
              const dashLength = (seg.percentage / 100) * CIRCUMFERENCE;
              const dashOffset = CIRCUMFERENCE - offset;
              offset += dashLength;
              return (
                <Circle
                  key={seg.category}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${dashLength} ${CIRCUMFERENCE - dashLength}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  rotation={-90}
                  origin={`${SIZE / 2}, ${SIZE / 2}`}
                />
              );
            })}
          </Svg>
          <View style={styles.center}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>${total.toFixed(0)}</Text>
          </View>
        </View>
        <View style={styles.legend}>
          {segments.map((seg) => (
            <View key={seg.category} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: seg.color }]} />
              <View>
                <Text style={[styles.legendCat, { color: colors.text }]}>
                  {seg.category}
                </Text>
                <Text style={[styles.legendPct, { color: colors.textSecondary }]}>
                  {seg.percentage.toFixed(0)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  svgWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  totalAmount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendCat: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  legendPct: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
