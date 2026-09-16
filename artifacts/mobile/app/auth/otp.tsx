import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, signIn, sendOtp } = useAuth();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [wrongCode, setWrongCode] = useState(false);
  const [resendError, setResendError] = useState("");
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(focusTimer);
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async (enteredCode?: string) => {
    const finalCode = enteredCode ?? code;
    if (finalCode.length !== OTP_LENGTH) return;

    setLoading(true);
    setWrongCode(false);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const valid = await verifyOtp(finalCode, email ?? "");
      if (valid) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        // Success animation
        Animated.spring(successAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 7,
        }).start(async () => {
          await signIn(email ?? "");
          router.replace("/(tabs)");
        });
      } else {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setWrongCode(true);
        shake();
        setCode("");
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setCode("");
    setWrongCode(false);
    setResendError("");
    try {
      await sendOtp(email ?? "");
      setCountdown(30);
    } catch {
      setResendError("Could not resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleCodeChange = (t: string) => {
    const d = t.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setCode(d);
    setWrongCode(false);
    if (d.length === OTP_LENGTH) {
      setTimeout(() => handleVerify(d), 80);
    }
  };

  const otpDigits = code.padEnd(OTP_LENGTH, " ").split("");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.content, { paddingBottom: bottomInset + 40 }]}>
        {/* Icon + title */}
        <View style={styles.top}>
          <View style={[styles.iconBox, { backgroundColor: colors.accent + "15" }]}>
            <Ionicons name="mail" size={36} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Enter OTP</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sent to{" "}
              <Text style={[styles.emailDisplay, { color: colors.text }]}>
                {email ?? ""}
            </Text>
          </Text>
        </View>

        {/* Hidden input */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleCodeChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          autoFocus
        />

        {/* OTP Boxes */}
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <TouchableOpacity
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}
            style={styles.otpRow}
          >
            {otpDigits.map((digit, i) => {
              const isCurrent = i === code.length && !loading;
              const filled = digit.trim().length > 0;
              return (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    {
                      backgroundColor: colors.surface,
                      borderColor: wrongCode
                        ? colors.accentRed
                        : isCurrent
                        ? colors.accent
                        : filled
                        ? colors.accent + "70"
                        : colors.border,
                      borderWidth: isCurrent || wrongCode ? 2 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.otpDigit,
                      { color: wrongCode ? colors.accentRed : colors.text },
                    ]}
                  >
                    {filled ? digit : ""}
                  </Text>
                  {isCurrent && !filled && (
                    <View style={[styles.cursor, { backgroundColor: colors.accent }]} />
                  )}
                </View>
              );
            })}
          </TouchableOpacity>
        </Animated.View>

        {/* Error message */}
        {wrongCode && (
          <View style={styles.errorRow}>
            <Ionicons name="close-circle" size={15} color={colors.accentRed} />
            <Text style={[styles.errorText, { color: colors.accentRed }]}>
              Incorrect OTP. Please try again.
            </Text>
          </View>
        )}
        {resendError ? (
          <Text style={[styles.errorText, { color: colors.accentRed }]}>
            {resendError}
          </Text>
        ) : null}

        {/* Verify button */}
        <TouchableOpacity
          onPress={() => handleVerify()}
          disabled={code.length !== OTP_LENGTH || loading}
          style={[
            styles.verifyBtn,
            {
              backgroundColor:
                code.length === OTP_LENGTH && !loading
                  ? colors.accent
                  : colors.border,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.verifyBtnText}>Verify OTP</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={[styles.resendLabel, { color: colors.textSecondary }]}>
            Didn't receive the code?{"  "}
          </Text>
          {countdown > 0 ? (
            <Text style={[styles.resendTimer, { color: colors.textMuted }]}>
              Resend in {countdown}s
            </Text>
          ) : resending ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={[styles.resendLink, { color: colors.accent }]}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { padding: 4 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
  },
  top: {
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  emailDisplay: {
    fontFamily: "Inter_700Bold",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpRow: {
    flexDirection: "row",
    gap: 10,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  otpDigit: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  cursor: {
    position: "absolute",
    bottom: 12,
    width: 2,
    height: 22,
    borderRadius: 1,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  verifyBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    minHeight: 24,
  },
  resendLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  resendTimer: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  resendLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
