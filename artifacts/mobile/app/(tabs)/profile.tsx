import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
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

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useReceipts } from "@/context/ReceiptsContext";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { user, signOut, updateProfile } = useAuth();
  const { receipts } = useReceipts();
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? "");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const stats = useMemo(() => {
    const total = receipts.reduce((s, r) => s + r.amount, 0);
    const now = new Date();
    const monthReceipts = receipts.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthTotal = monthReceipts.reduce((s, r) => s + r.amount, 0);
    const categories = new Set(receipts.map((r) => r.category)).size;
    return { total, monthTotal, count: receipts.length, categories };
  }, [receipts]);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          await signOut();
        },
      },
    ]);
  };

  const handleSaveName = async () => {
    if (nameInput.trim()) {
      await updateProfile({ name: nameInput.trim() });
    }
    setEditingName(false);
  };

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const joinDate = user?.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & name */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent + "20" }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>
          </View>

          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={[styles.nameInput, { color: colors.text, borderColor: colors.border }]}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity onPress={handleSaveName} style={[styles.saveNameBtn, { backgroundColor: colors.accent }]}>
                <Ionicons name="checkmark" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setNameInput(user?.name ?? ""); setEditingName(true); }} style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
              <Ionicons name="pencil" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          <Text style={[styles.phone, { color: colors.textSecondary }]}>🇮🇳 +91 {user?.phone?.replace(/(\d{5})(\d{5})/, "$1 $2")}</Text>
          <Text style={[styles.joinDate, { color: colors.textMuted }]}>Member since {joinDate}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.count}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Receipts</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>${stats.monthTotal.toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Month</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>${stats.total.toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>All Time</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.categories}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Categories</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Settings</Text>

          <TouchableOpacity
            style={[styles.settingsRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push("/scan")}
          >
            <View style={[styles.settingsIcon, { backgroundColor: colors.accent + "15" }]}>
              <Ionicons name="scan" size={18} color={colors.accent} />
            </View>
            <Text style={[styles.settingsLabel, { color: colors.text }]}>Scan Receipt</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsRow, { borderBottomColor: colors.border }]}
          >
            <View style={[styles.settingsIcon, { backgroundColor: colors.accentGreen + "15" }]}>
              <Ionicons name="notifications" size={18} color={colors.accentGreen} />
            </View>
            <Text style={[styles.settingsLabel, { color: colors.text }]}>Notifications</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.settingsIcon, { backgroundColor: "#9B59B6" + "15" }]}>
              <Ionicons name="shield-checkmark" size={18} color="#9B59B6" />
            </View>
            <Text style={[styles.settingsLabel, { color: colors.text }]}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={[styles.signOutBtn, { backgroundColor: colors.accentRed + "15", borderColor: colors.accentRed + "30" }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.accentRed} />
          <Text style={[styles.signOutText, { color: colors.accentRed }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  profileCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameInput: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    borderBottomWidth: 2,
    paddingBottom: 2,
    minWidth: 120,
  },
  saveNameBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  phone: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  joinDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  section: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingTop: 14,
    paddingBottom: 10,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
