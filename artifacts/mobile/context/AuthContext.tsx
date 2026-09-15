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
  phone: string;
  name: string;
  joinedAt: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (phone: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (code: string, phone: string) => Promise<boolean>;
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
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load auth", e);
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = useCallback(async (phone: string): Promise<void> => {
    const response = await sendOtpRequest({ phone });
    if (!response.success) {
      throw new Error("SMS delivery was not accepted");
    }
  }, []);

  const verifyOtp = useCallback(async (code: string, phone: string): Promise<boolean> => {
    const response = await verifyOtpRequest({ phone, code });
    return response.verified;
  }, []);

  const signIn = useCallback(async (phone: string, name = "") => {
    const profile: UserProfile = {
      phone,
      name: name || phone,
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
