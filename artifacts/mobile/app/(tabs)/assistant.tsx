import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useReceipts } from "@/context/ReceiptsContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? "";

export default function AssistantScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { receipts } = useReceipts();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your financial assistant. Ask me anything about your spending, like \"What's my total this month?\" or \"How much did I spend on dining?\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const tabBarHeight = useBottomTabBarHeight();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const buildSystemPrompt = () => {
    const now = new Date();
    const totalSpent = receipts.reduce((s, r) => s + r.amount, 0);
    const thisMonth = receipts.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthTotal = thisMonth.reduce((s, r) => s + r.amount, 0);

    const summary = receipts
      .slice(0, 30)
      .map(
        (r) =>
          `${r.date}: ${r.merchant} - $${r.amount.toFixed(2)} (${r.category})`
      )
      .join("\n");

    return `You are a helpful personal finance assistant for the ReceiptAI app. You help users understand their spending habits and provide actionable savings recommendations.

Current data:
- Total receipts: ${receipts.length}
- Total all-time spending: $${totalSpent.toFixed(2)}
- This month's spending: $${monthTotal.toFixed(2)}
- Current date: ${now.toLocaleDateString()}

Recent transactions (up to 30):
${summary || "No transactions yet."}

Be concise, friendly, and data-driven. Format monetary values with $ and 2 decimal places.`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [userMsg, ...prev]);
    setInput("");
    setLoading(true);

    try {
      if (!GROQ_API_KEY) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `To enable the AI assistant, add your xAI Grok API key as EXPO_PUBLIC_GROK_API_KEY in your environment settings.\n\nYour spending summary:\n• Total receipts: ${receipts.length}\n• This month: $${receipts.filter(r => { const d = new Date(r.date); const n = new Date(); return d.getMonth() === n.getMonth(); }).reduce((s, r) => s + r.amount, 0).toFixed(2)}`,
        };
        setMessages((prev) => [assistantMsg, ...prev]);
        return;
      }

      const historyForApi = [...messages]
        .reverse()
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(GROK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-3-mini",
          messages: [
            { role: "system", content: buildSystemPrompt() },
            ...historyForApi,
            { role: "user", content: userMsg.content },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errDetail = data?.error ?? data?.message ?? "";
        const errStr = typeof errDetail === "string" ? errDetail : JSON.stringify(errDetail);
        // Credits / billing issue
        if (res.status === 403 && errStr.toLowerCase().includes("credit")) {
          throw new Error("NO_CREDITS");
        }
        throw new Error(errStr || `API error ${res.status}`);
      }

      const reply =
        data.choices?.[0]?.message?.content ??
        "Sorry, I couldn't get a response. Please try again.";

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
      };
      setMessages((prev) => [assistantMsg, ...prev]);
    } catch (e: any) {
      const isNoCredits = e?.message === "NO_CREDITS";
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: isNoCredits
          ? "⚠️ Your xAI account has no credits yet.\n\nTo use the AI assistant, add credits at:\nconsole.x.ai → Billing\n\nOnce credits are added, the assistant will work instantly."
          : `Sorry, something went wrong. Please check your connection and try again.`,
      };
      setMessages((prev) => [assistantMsg, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.accent }]
            : [styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
        ]}
      >
        {!isUser && (
          <View
            style={[
              styles.aiAvatar,
              { backgroundColor: colors.accent + "20" },
            ]}
          >
            <Ionicons name="sparkles" size={14} color={colors.accent} />
          </View>
        )}
        <Text
          style={[
            styles.bubbleText,
            { color: isUser ? "#FFF" : colors.text },
          ]}
        >
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, marginBottom: tabBarHeight }]}>
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
        <View style={styles.headerContent}>
          <View style={[styles.aiIcon, { backgroundColor: colors.accent + "20" }]}>
            <Ionicons name="sparkles" size={20} color={colors.accent} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              AI Assistant
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Powered by Grok
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={tabBarHeight}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={[
            styles.messageList,
            { paddingBottom: 16 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            loading ? (
              <View
                style={[
                  styles.loadingBubble,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : null
          }
        />

        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: Platform.OS === "web" ? bottomInset + 12 : 12,
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceSecondary,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your spending..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || loading}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  input.trim() && !loading ? colors.accent : colors.border,
              },
            ]}
          >
            <Ionicons name="arrow-up" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexGrow: 1,
    gap: 10,
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  userBubble: {
    alignSelf: "flex-end",
  },
  aiBubble: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    flex: 1,
  },
  loadingBubble: {
    alignSelf: "flex-start",
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
