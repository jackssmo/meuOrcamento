import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";
import type { FinancialSummary, Transaction, TransactionType } from "../types/models";
import { MONTH_NAMES } from "../constants/designSystem";

interface FinancialContextValue {
  // Período Global
  selectedMonth: number;
  selectedYear: number;
  periodLabel: string;
  nextMonth: () => void;
  prevMonth: () => void;
  setPeriod: (month: number, year: number) => void;
  resetToCurrentMonth: () => void;

  // Resumo Financeiro Global em Cache
  summary: FinancialSummary | null;
  isLoadingSummary: boolean;
  refreshSummary: () => Promise<void>;

  // Chave de Sincronização Global
  refreshKey: number;
  triggerRefresh: () => void;

  // Estado do Modal Global de Transação
  isTransactionModalOpen: boolean;
  editingTransaction: Transaction | null;
  defaultTransactionType: TransactionType;
  openNewTransaction: (type?: TransactionType) => void;
  openEditTransaction: (transaction: Transaction) => void;
  closeTransactionModal: () => void;
}

const FinancialContext = createContext<FinancialContextValue | undefined>(undefined);

export function FinancialProvider({ children }: { children: ReactNode }) {
  const { signed } = useAuth();

  // Inicialização do período (mês e ano correntes)
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const saved = localStorage.getItem("selected_month");
    return saved ? Number(saved) : new Date().getMonth() + 1;
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem("selected_year");
    return saved ? Number(saved) : new Date().getFullYear();
  });

  // Modal Global
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [defaultTransactionType, setDefaultTransactionType] = useState<TransactionType>("expense");

  // Sincronização e Resumo
  const [refreshKey, setRefreshKey] = useState(0);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Persistir mês e ano no storage para conveniência
  const setPeriod = useCallback((month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    localStorage.setItem("selected_month", String(month));
    localStorage.setItem("selected_year", String(year));
  }, []);

  const nextMonth = useCallback(() => {
    if (selectedMonth === 12) {
      setPeriod(1, selectedYear + 1);
    } else {
      setPeriod(selectedMonth + 1, selectedYear);
    }
  }, [selectedMonth, selectedYear, setPeriod]);

  const prevMonth = useCallback(() => {
    if (selectedMonth === 1) {
      setPeriod(12, selectedYear - 1);
    } else {
      setPeriod(selectedMonth - 1, selectedYear);
    }
  }, [selectedMonth, selectedYear, setPeriod]);

  const resetToCurrentMonth = useCallback(() => {
    const today = new Date();
    setPeriod(today.getMonth() + 1, today.getFullYear());
  }, [setPeriod]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  // Modal Controls
  const openNewTransaction = useCallback((type: TransactionType = "expense") => {
    setEditingTransaction(null);
    setDefaultTransactionType(type);
    setIsTransactionModalOpen(true);
  }, []);

  const openEditTransaction = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setDefaultTransactionType(transaction.type);
    setIsTransactionModalOpen(true);
  }, []);

  const closeTransactionModal = useCallback(() => {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
  }, []);

  // Buscar Resumo Financeiro do Período
  const refreshSummary = useCallback(async () => {
    if (!signed) return;
    try {
      setIsLoadingSummary(true);
      const response = await api.get<FinancialSummary>("/transactions/summary", {
        params: { month: selectedMonth, year: selectedYear },
      });
      setSummary(response.data);
    } catch (error) {
      console.error("Erro ao carregar resumo financeiro:", error);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [signed, selectedMonth, selectedYear]);

  // Recarregar resumo quando o período ou a chave de sincronização mudam
  useEffect(() => {
    if (signed) {
      void refreshSummary();
    }
  }, [signed, refreshSummary, refreshKey]);

  const periodLabel = useMemo(() => {
    const monthName = MONTH_NAMES[selectedMonth - 1] || "";
    return `${monthName} de ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  const value = useMemo(
    () => ({
      selectedMonth,
      selectedYear,
      periodLabel,
      nextMonth,
      prevMonth,
      setPeriod,
      resetToCurrentMonth,
      summary,
      isLoadingSummary,
      refreshSummary,
      refreshKey,
      triggerRefresh,
      isTransactionModalOpen,
      editingTransaction,
      defaultTransactionType,
      openNewTransaction,
      openEditTransaction,
      closeTransactionModal,
    }),
    [
      selectedMonth,
      selectedYear,
      periodLabel,
      nextMonth,
      prevMonth,
      setPeriod,
      resetToCurrentMonth,
      summary,
      isLoadingSummary,
      refreshSummary,
      refreshKey,
      triggerRefresh,
      isTransactionModalOpen,
      editingTransaction,
      defaultTransactionType,
      openNewTransaction,
      openEditTransaction,
      closeTransactionModal,
    ]
  );

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
}

// Hook de consumo
export function useFinancial() {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error("useFinancial deve ser utilizado dentro de um FinancialProvider.");
  }
  return context;
}
