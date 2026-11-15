export type TransactionType = "income" | "expense";

export interface Transaction {
  id: number;
  user_id?: number;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
  category: string;
  card?: string | null;
  account_id?: number | null;
  is_fixed?: boolean | number;
  installments?: number;
  current_installment?: number;
  installment_group_id?: string | null;
  is_paid?: boolean | number;
  created_at?: string;
}

export interface CardItem {
  id: number;
  name: string;
  credit_limit: number;
  used_limit?: number;
  available_limit?: number;
  closing_day?: number | null;
  due_day?: number | null;
  created_at?: string;
}

export interface Budget {
  id: number;
  category: string;
  month: number;
  year: number;
  amount: number;
  spent_amount?: number;
  remaining_amount?: number;
  created_at?: string;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string | null;
  color?: string | null;
  created_at?: string;
}

export type CategoryType = "income" | "expense" | "both";

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  color?: string | null;
  created_at?: string;
}

export type AccountType = "checking" | "cash" | "savings" | "credit_card";

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  initial_balance: number;
  current_balance?: number;
  credit_limit?: number | null;
  closing_day?: number | null;
  due_day?: number | null;
  created_at?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  paidExpense: number;
  pendingExpense: number;
  balance: number;
  realizedBalance: number;
}

export interface MonthlyHistoryItem {
  month: number;
  income: number;
  expense: number;
}

export interface MonthlyReport {
  monthly: MonthlyHistoryItem[];
  byCategory?: Record<string, number>;
  byCard?: Record<string, number>;
  daily?: Record<string, number>;
}
