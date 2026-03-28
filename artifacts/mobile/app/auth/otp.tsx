import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, signIn, sendOtp } = useAuth();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputRef = useRef<TextInput>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleVerify = async () => {
    if (code.length !== OTP_LENGTH) return;
    setLoading(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const valid = await verifyOtp(code, phone ?? "");
      if (valid) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        await signIn(phone ?? "", phone ?? "");
        router.replace("/(tabs)");
      } else {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert("Invalid code", "The code you entered is incorrect or expired.");
        setCode("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const newOtp = await sendOtp(phone ?? "");
      Alert.alert("New code sent", `Your new code is: ${newOtp}`);
      setCountdown(30);
      setCode("");
    } finally {
      setResending(false);
    }
  };

  // OTP boxes display
  const digits = code.padEnd(OTP_LENGTH, " ").split("");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.content, { paddingBottom: bottomInset + 40 }]}>
        <View style={styles.top}>
          <View style={[styles.iconBox, { backgroundColor: colors.accent + "15" }]}>
            <Ionicons name="phone-portrait" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Verify your number</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter the 6-digit code sent to{"\n"}
            <Text style={[styles.phoneDisplay, { color: colors.text }]}>+1 {phone}</Text>
          </Text>
        </View>

        {/* Hidden actual input */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(t) => {
            const digits = t.replace(/\D/g, "").slice(0, OTP_LENGTH);
            setCode(digits);
            if (digits.length === OTP_LENGTH) {
              setTimeout(handleVerify, 100);
            }
          }}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          autoFocus
        />

        {/* OTP display boxes */}
        <TouchableOpacity
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}
          style={styles.otpRow}
        >
          {digits.map((digit, i) => {
            const isCurrent = i === code.length;
            const filled = digit.trim().length > 0;
            return (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isCurrent
                      ? colors.accent
                      : filled
                      ? colors.accent + "60"
                      : colors.border,
                    borderWidth: isCurrent ? 2 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text style={[styles.otpDigit, { color: colors.text }]}>
                  {filled ? digit : ""}
                </Text>
                {isCurrent && (
                  <View style={[styles.cursor, { backgroundColor: colors.accent }]} />
                )}
              </View>
            );
          })}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleVerify}
          disabled={code.length !== OTP_LENGTH || loading}
          style={[
            styles.verifyBtn,
            {
              backgroundColor:
                code.length === OTP_LENGTH && !loading ? colors.accent : colors.border,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.verifyBtnText}>Verify</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={[styles.resendTimer, { color: colors.textSecondary }]}>
              Resend code in {countdown}s
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={[styles.resendLink, { color: colors.accent }]}>
                  Resend code
                </Text>
              )}
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
    gap: 24,
  },
  top: {
    alignItems: "center",
    gap: 12,
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
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  phoneDisplay: {
    fontFamily: "Inter_600SemiBold",
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
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  otpDigit: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  cursor: {
    position: "absolute",
    bottom: 12,
    width: 2,
    height: 24,
    borderRadius: 1,
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
    alignItems: "center",
    minHeight: 24,
  },
  resendTimer: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  resendLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
