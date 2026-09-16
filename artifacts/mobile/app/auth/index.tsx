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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendOtp } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const normalizedEmail = email.trim().toLowerCase();
  const isValid = EMAIL_REGEX.test(normalizedEmail);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleChangeText = (t: string) => {
    setEmail(t);
    setError("");
  };

  const handleSend = async () => {
    if (!isValid) {
      setError("Please enter a valid email address");
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
      await sendOtp(normalizedEmail);
      router.push({
        pathname: "/auth/otp",
        params: { email: normalizedEmail },
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
              Enter your email address
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              We'll send a 6-digit OTP to verify your email
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
                <View style={[styles.emailIcon, { borderRightColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.emailInput, { color: colors.text }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={handleChangeText}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
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
                We never share your email
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
  emailIcon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 54,
    height: "100%",
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  emailInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    height: "100%",
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
