export interface Transaction {
  id?: number;
  user_id?: number;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  is_fixed?: boolean;
  installments?: number;
  installment_number?: number;
  card?: string | null;
  is_paid?: boolean;
}

export interface CardItem {
  id: number;
  user_id?: number;
  name: string;
  credit_limit: number;
  used_limit: number;
  available_limit: number;
  created_at?: string;
}
