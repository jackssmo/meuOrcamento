import { z } from 'zod';

export const transactionSchema = z.object({
  description: z.string().trim().min(2, 'A descrição deve ter pelo menos 2 caracteres.'),
  amount: z.number().finite().positive('O valor deve ser maior que zero.'),
  type: z.enum(['income', 'expense']),
  category: z.string().trim().min(1, 'A categoria é obrigatória.'),
  date: z.coerce.date({ message: 'Informe uma data válida.' }),
  is_fixed: z.boolean().optional().default(false),
  installments: z.number().int().min(1).max(60).optional().default(1),
  account_id: z.number().int().positive().nullable().optional(),
  card: z.string().trim().min(2).max(120).nullable().optional(),
  is_paid: z.boolean().optional().default(false),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
