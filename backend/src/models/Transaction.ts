export interface Transaction {
  id?: number; 
  user_id: number; 
  description: string;
  amount: number; 
  type: 'income' | 'expense';
  category: string; 
  date: string | Date; 
  is_fixed?: boolean;
  installments?: number;
  installment_number?: number;
  installment_group_id?: string | null;
  recurrence_end_date?: string | Date | null;
  account_id?: number | null | undefined;
  card?: string | null;
  is_paid?: boolean;
  created_at?: Date;
}

}