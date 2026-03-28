import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

export default function PhoneScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendOtp } = useAuth();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const isValid = phone.replace(/\D/g, "").length >= 10;

  const handleSend = async () => {
    if (!isValid) return;
    setLoading(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const otp = await sendOtp(phone.trim());
      // For demo: show OTP in alert since we have no SMS backend
      Alert.alert(
        "OTP Sent",
        `Your verification code is: ${otp}\n\n(In production, this would be sent via SMS)`,
        [{ text: "OK", onPress: () => router.push({ pathname: "/auth/otp", params: { phone: phone.trim() } }) }]
      );
    } catch (e) {
      Alert.alert("Error", "Could not send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.content, { paddingTop: topInset + 40, paddingBottom: bottomInset + 40 }]}>
          {/* Logo / Brand */}
          <View style={styles.brand}>
            <View style={[styles.logoBox, { backgroundColor: colors.accent + "20" }]}>
              <Ionicons name="receipt" size={40} color={colors.accent} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>ReceiptAI</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Smart expense tracking powered by AI
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              Enter your phone number
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              We'll send you a verification code
            </Text>

            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.countryCode, { borderRightColor: colors.border }]}>
                <Text style={[styles.countryCodeText, { color: colors.text }]}>+1</Text>
              </View>
              <TextInput
                style={[styles.phoneInput, { color: colors.text }]}
                placeholder="(555) 000-0000"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={(t) => setPhone(formatPhone(t))}
                keyboardType="phone-pad"
                maxLength={14}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSend}
              />
            </View>

            <TouchableOpacity
              onPress={handleSend}
              disabled={!isValid || loading}
              style={[
                styles.sendBtn,
                { backgroundColor: isValid && !loading ? colors.accent : colors.border },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.sendBtnText}>Send Code</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  brand: {
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  form: {
    gap: 14,
  },
  formTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  formSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    height: 54,
  },
  countryCode: {
    paddingHorizontal: 16,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  countryCodeText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    height: "100%",
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  sendBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
