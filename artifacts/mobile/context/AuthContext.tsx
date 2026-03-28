import AsyncStorage from "@react-native-async-storage/async-storage";
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
  pendingOtp: string | null;
  sendOtp: (phone: string) => Promise<string>;
  verifyOtp: (code: string, phone: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_KEY = "receiptai_auth";
const OTP_KEY = "receiptai_otp";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOtp, setPendingOtp] = useState<string | null>(null);

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

  const sendOtp = useCallback(async (phone: string): Promise<string> => {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Store it locally (in production this would be sent via SMS)
    await AsyncStorage.setItem(OTP_KEY, JSON.stringify({ otp, phone, expires: Date.now() + 5 * 60 * 1000 }));
    setPendingOtp(otp);
    return otp;
  }, []);

  const verifyOtp = useCallback(async (code: string, phone: string): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem(OTP_KEY);
      if (!stored) return false;
      const { otp, expires } = JSON.parse(stored);
      if (Date.now() > expires) return false;
      return otp === code;
    } catch {
      return false;
    }
  }, []);

  const signIn = useCallback(async (phone: string, name = "") => {
    const profile: UserProfile = {
      phone,
      name: name || phone,
      joinedAt: Date.now(),
    };
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(profile));
    await AsyncStorage.removeItem(OTP_KEY);
    setPendingOtp(null);
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
        pendingOtp,
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
