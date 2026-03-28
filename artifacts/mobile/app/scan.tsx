import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { Category, useReceipts } from "@/context/ReceiptsContext";

const CATEGORIES: Category[] = [
  "Groceries",
  "Dining",
  "Transport",
  "Coffee",
  "Shopping",
  "Healthcare",
  "Entertainment",
  "Other",
];

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

export default function ScanScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addReceipt } = useReceipts();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<Category>("Other");
  const [saving, setSaving] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const pickFromCamera = async () => {
    if (Platform.OS === "web") {
      pickFromGallery();
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to scan receipts.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      handleImage(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      handleImage(result.assets[0].uri);
    }
  };

  const handleImage = async (uri: string) => {
    setImageUri(uri);
    setProcessing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Simulate OCR processing - in production, integrate with Google ML Kit or Vision API
    await new Promise((res) => setTimeout(res, 1500));

    // Auto-suggest category based on mock OCR
    const mockMerchants = [
      { name: "Whole Foods Market", category: "Groceries" as Category, amount: "47.23" },
      { name: "Starbucks", category: "Coffee" as Category, amount: "6.85" },
      { name: "McDonald's", category: "Dining" as Category, amount: "12.40" },
      { name: "Uber", category: "Transport" as Category, amount: "18.50" },
      { name: "CVS Pharmacy", category: "Healthcare" as Category, amount: "24.99" },
    ];

    setProcessing(false);
  };

  const handleSave = async () => {
    if (!merchant.trim()) {
      Alert.alert("Missing info", "Please enter a merchant name.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    setSaving(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      await addReceipt({
        merchant: merchant.trim(),
        amount: parsedAmount,
        date,
        category,
        imageUri: imageUri ?? undefined,
      });
      router.back();
    } catch (e) {
      Alert.alert("Error", "Failed to save receipt.");
    } finally {
      setSaving(false);
    }
  };

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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Add Receipt
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomInset + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image capture area */}
        <View style={styles.imageSection}>
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              {processing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator color="#FFF" size="large" />
                  <Text style={styles.processingText}>Scanning receipt...</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={() => setImageUri(null)}
              >
                <Ionicons name="refresh" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.captureRow}>
              <TouchableOpacity
                style={[styles.captureBtn, { backgroundColor: colors.accent }]}
                onPress={pickFromCamera}
              >
                <Ionicons name="camera" size={24} color="#FFF" />
                <Text style={styles.captureBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.captureBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={pickFromGallery}
              >
                <Ionicons name="image" size={24} color={colors.text} />
                <Text style={[styles.captureBtnText, { color: colors.text }]}>
                  Gallery
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Merchant
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g. Whole Foods"
              placeholderTextColor={colors.textMuted}
              value={merchant}
              onChangeText={setMerchant}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Amount ($)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Date
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={date}
                onChangeText={setDate}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Category
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const selected = cat === category;
                const catColor = colors.categories[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selected
                          ? catColor + "20"
                          : colors.surface,
                        borderColor: selected ? catColor : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={CATEGORY_ICONS[cat] as any}
                      size={14}
                      color={selected ? catColor : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color: selected ? catColor : colors.textSecondary,
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[
            styles.saveBtn,
            { backgroundColor: saving ? colors.border : colors.accent },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Receipt</Text>
            </>
          )}
        </TouchableOpacity>
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
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    padding: 16,
    gap: 20,
  },
  imageSection: {},
  captureRow: {
    flexDirection: "row",
    gap: 12,
  },
  captureBtn: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  captureBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  processingText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  retakeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: StyleSheet.hairlineWidth,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
