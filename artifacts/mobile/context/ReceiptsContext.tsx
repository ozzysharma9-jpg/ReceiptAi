import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Category =
  | "Groceries"
  | "Dining"
  | "Transport"
  | "Coffee"
  | "Shopping"
  | "Healthcare"
  | "Entertainment"
  | "Other";

export interface Receipt {
  id: string;
  merchant: string;
  date: string;
  amount: number;
  category: Category;
  imageUri?: string;
  rawText?: string;
  createdAt: number;
}

interface ReceiptsContextType {
  receipts: Receipt[];
  addReceipt: (receipt: Omit<Receipt, "id" | "createdAt">) => Promise<void>;
  updateReceipt: (id: string, updates: Partial<Receipt>) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;
  loading: boolean;
}

const ReceiptsContext = createContext<ReceiptsContextType | null>(null);

const STORAGE_KEY = "receiptai_receipts";

export function ReceiptsProvider({ children }: { children: React.ReactNode }) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Receipt[] = JSON.parse(stored);
        parsed.sort((a, b) => b.createdAt - a.createdAt);
        setReceipts(parsed);
      }
    } catch (e) {
      console.error("Failed to load receipts", e);
    } finally {
      setLoading(false);
    }
  };

  const saveReceipts = async (updated: Receipt[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addReceipt = useCallback(
    async (receipt: Omit<Receipt, "id" | "createdAt">) => {
      const newReceipt: Receipt = {
        ...receipt,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
      };
      const updated = [newReceipt, ...receipts];
      setReceipts(updated);
      await saveReceipts(updated);
    },
    [receipts]
  );

  const updateReceipt = useCallback(
    async (id: string, updates: Partial<Receipt>) => {
      const updated = receipts.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      );
      setReceipts(updated);
      await saveReceipts(updated);
    },
    [receipts]
  );

  const deleteReceipt = useCallback(
    async (id: string) => {
      const updated = receipts.filter((r) => r.id !== id);
      setReceipts(updated);
      await saveReceipts(updated);
    },
    [receipts]
  );

  return (
    <ReceiptsContext.Provider
      value={{ receipts, addReceipt, updateReceipt, deleteReceipt, loading }}
    >
      {children}
    </ReceiptsContext.Provider>
  );
}

export function useReceipts() {
  const ctx = useContext(ReceiptsContext);
  if (!ctx) throw new Error("useReceipts must be used within ReceiptsProvider");
  return ctx;
}
