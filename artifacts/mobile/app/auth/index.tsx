import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export default function PhoneScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendOtp } = useAuth();

  const [digits, setDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const rawDigits = digits.replace(/\D/g, "").slice(0, 10);
  const isValid = INDIAN_MOBILE_REGEX.test(rawDigits);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const formatDisplay = (raw: string) => {
    const d = raw.slice(0, 10);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)} ${d.slice(5)}`;
  };

  const handleChangeText = (t: string) => {
    const d = t.replace(/\D/g, "").slice(0, 10);
    setDigits(d);
    setError("");
  };

  const handleSend = async () => {
    if (!isValid) {
      if (rawDigits.length === 10 && !/^[6-9]/.test(rawDigits)) {
        setError("Indian mobile numbers must start with 6, 7, 8, or 9");
      } else if (rawDigits.length < 10) {
        setError("Please enter a valid 10-digit mobile number");
      }
      shake();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setLoading(true);
    setError("");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const otp = await sendOtp(rawDigits);
      // Navigate to OTP screen - show code for demo since no SMS backend
      router.push({
        pathname: "/auth/otp",
        params: { phone: rawDigits, otp },
      });
    } catch (e) {
      setError("Could not send OTP. Please try again.");
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            styles.content,
            { paddingTop: topInset + 40, paddingBottom: bottomInset + 40 },
          ]}
        >
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
              Enter your mobile number
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              We'll send a 6-digit OTP to verify your number
            </Text>

            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surface,
                    borderColor: error ? colors.accentRed : isValid ? colors.accentGreen : colors.border,
                    borderWidth: error || isValid ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                {/* Indian flag + code */}
                <View style={[styles.countryCode, { borderRightColor: colors.border }]}>
                  <Text style={styles.flag}>🇮🇳</Text>
                  <Text style={[styles.countryCodeText, { color: colors.text }]}>+91</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, { color: colors.text }]}
                  placeholder="98765 43210"
                  placeholderTextColor={colors.textMuted}
                  value={formatDisplay(rawDigits)}
                  onChangeText={handleChangeText}
                  keyboardType="phone-pad"
                  maxLength={11}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSend}
                />
                {isValid && (
                  <View style={styles.validIcon}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.accentGreen} />
                  </View>
                )}
              </View>
            </Animated.View>

            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color={colors.accentRed} />
                <Text style={[styles.errorText, { color: colors.accentRed }]}>{error}</Text>
              </View>
            ) : (
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                {rawDigits.length}/10 digits
              </Text>
            )}

            <TouchableOpacity
              onPress={handleSend}
              disabled={loading}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: isValid && !loading ? colors.accent : colors.border,
                  opacity: loading ? 0.8 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.sendBtnText}>Send OTP</Text>
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
    gap: 12,
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
    overflow: "hidden",
    height: 56,
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: "100%",
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  flag: {
    fontSize: 20,
  },
  countryCodeText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    height: "100%",
    letterSpacing: 1,
  },
  validIcon: {
    paddingRight: 14,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
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
