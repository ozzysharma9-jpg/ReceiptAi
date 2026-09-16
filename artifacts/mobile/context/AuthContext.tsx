import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendOtp as sendOtpRequest,
  verifyOtp as verifyOtpRequest,
} from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface UserProfile {
  email: string;
  name: string;
  joinedAt: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (code: string, email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_KEY = "receiptai_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuth();
  }, []);

  const loadAuth = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserProfile>;
        if (typeof parsed.email === "string" && parsed.email.length > 0) {
          setUser(parsed as UserProfile);
        } else {
          await AsyncStorage.removeItem(AUTH_KEY);
        }
      }
    } catch (e) {
      console.error("Failed to load auth", e);
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = useCallback(async (email: string): Promise<void> => {
    const response = await sendOtpRequest({ email });
    if (!response.success) {
      throw new Error("SMS delivery was not accepted");
    }
  }, []);

  const verifyOtp = useCallback(async (code: string, email: string): Promise<boolean> => {
    const response = await verifyOtpRequest({ email, code });
    return response.verified;
  }, []);

  const signIn = useCallback(async (email: string, name = "") => {
    const profile: UserProfile = {
      email,
      name: name || email,
      joinedAt: Date.now(),
    };
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(profile));
    setUser(profile);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        updateProfile,
        sendOtp,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
