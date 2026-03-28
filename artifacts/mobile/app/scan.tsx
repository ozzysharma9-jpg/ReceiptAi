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

const GROK_API_KEY = process.env.EXPO_PUBLIC_GROK_API_KEY ?? "";

async function extractReceiptWithGrok(imageUri: string): Promise<{
  merchant: string;
  amount: string;
  date: string;
  category: Category;
} | null> {
  try {
    // Convert image to base64
    let base64Image = "";

    if (Platform.OS === "web") {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      const { FileSystem } = await import("expo-file-system");
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      base64Image = base64;
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-2-vision-1212",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high",
                },
              },
              {
                type: "text",
                text: `Analyze this receipt image and extract the following details. Respond ONLY with a valid JSON object (no markdown, no code blocks):
{
  "merchant": "store/restaurant name",
  "amount": "total amount as number string e.g. 24.99",
  "date": "date in YYYY-MM-DD format, use today if not visible",
  "category": "one of: Groceries, Dining, Transport, Coffee, Shopping, Healthcare, Entertainment, Other"
}

If you cannot determine a value, use reasonable defaults. Today's date is ${new Date().toISOString().split("T")[0]}.`,
              },
            ],
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      merchant: parsed.merchant ?? "",
      amount: String(parsed.amount ?? ""),
      date: parsed.date ?? new Date().toISOString().split("T")[0],
      category: (CATEGORIES.includes(parsed.category) ? parsed.category : "Other") as Category,
    };
  } catch (e) {
    console.error("Grok OCR error:", e);
    return null;
  }
}

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
  const [aiExtracted, setAiExtracted] = useState(false);

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
      base64: false,
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
    setAiExtracted(false);
    setMerchant("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setCategory("Other");

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (GROK_API_KEY) {
        const extracted = await extractReceiptWithGrok(uri);
        if (extracted) {
          setMerchant(extracted.merchant);
          setAmount(extracted.amount);
          setDate(extracted.date);
          setCategory(extracted.category);
          setAiExtracted(true);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }
    } catch (e) {
      console.error("Extraction failed", e);
    } finally {
      setProcessing(false);
    }
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Receipt</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 20 }]}
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
                  <Text style={styles.processingText}>AI scanning receipt...</Text>
                  <Text style={styles.processingSubtext}>Extracting details with Grok</Text>
                </View>
              )}
              {!processing && (
                <TouchableOpacity style={styles.retakeBtn} onPress={() => { setImageUri(null); setAiExtracted(false); }}>
                  <Ionicons name="refresh" size={16} color="#FFF" />
                </TouchableOpacity>
              )}
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
                style={[styles.captureBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={pickFromGallery}
              >
                <Ionicons name="image" size={24} color={colors.text} />
                <Text style={[styles.captureBtnText, { color: colors.text }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AI extracted badge */}
        {aiExtracted && !processing && (
          <View style={[styles.aiBadge, { backgroundColor: colors.accentGreen + "15", borderColor: colors.accentGreen + "40" }]}>
            <Ionicons name="sparkles" size={14} color={colors.accentGreen} />
            <Text style={[styles.aiBadgeText, { color: colors.accentGreen }]}>
              Details auto-filled by Grok AI — review and edit if needed
            </Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Merchant</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: aiExtracted ? colors.accentGreen + "60" : colors.border }]}
              placeholder="e.g. Whole Foods"
              placeholderTextColor={colors.textMuted}
              value={merchant}
              onChangeText={setMerchant}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Amount ($)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: aiExtracted ? colors.accentGreen + "60" : colors.border }]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: aiExtracted ? colors.accentGreen + "60" : colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={date}
                onChangeText={setDate}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
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
                      { backgroundColor: selected ? catColor + "20" : colors.surface, borderColor: selected ? catColor : colors.border },
                    ]}
                  >
                    <Ionicons name={CATEGORY_ICONS[cat] as any} size={14} color={selected ? catColor : colors.textMuted} />
                    <Text style={[styles.categoryText, { color: selected ? catColor : colors.textSecondary }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || processing}
          style={[styles.saveBtn, { backgroundColor: saving || processing ? colors.border : colors.accent }]}
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
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 16 },
  imageSection: {},
  captureRow: { flexDirection: "row", gap: 12 },
  captureBtn: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  captureBtnText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  imageContainer: { position: "relative", borderRadius: 16, overflow: "hidden" },
  previewImage: { width: "100%", height: 220, borderRadius: 16 },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  processingText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  processingSubtext: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
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
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiBadgeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  fieldRow: { flexDirection: "row", gap: 12 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
